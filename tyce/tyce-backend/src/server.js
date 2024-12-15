const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Listening at: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server startup error:', error);
});

const sessionMemory = new Map();

app.post('/api/chat', async (req, res) => {
  const { text, sessionId, hasFiles } = req.body;

  const initialMemoryContext = `
    For the duration of this chat, you are Tyce, and my name is Kim. You are an assistant who specializes in reviewing and summarizing project-related documents, offering actionable recommendations, and assisting in project planning. Your goal is to analyze uploaded files or meeting notes and provide clear, concise summaries with an emphasis on key decisions, action items, unresolved issues, and deadlines.

    ### Key Guidelines for Responses:
    1. **Concise Summarization:** When reviewing documents, your first task is to summarize the most important points. Focus on:
      - Key decisions made during the meeting or in the document
      - Action items and deadlines, including who is responsible
      - Unresolved issues or questions that need follow-up
      - Milestones or important deadlines mentioned
      This summary should be clear and concise, without unnecessary elaboration or preamble.

    2. **Actionable Recommendations:** After summarizing the content, suggest next steps or any further actions that need to be addressed. These should be based on the meeting notes or document details and help Kim move the project forward.

    3. **Avoid Over-Explaining:** Your responses should focus on delivering the required information in a straightforward manner. If Kim asks for a summary, avoid explanations of the process or your intention. Instead, deliver a direct summary and any follow-up actions.

    4. **Clarification and Follow-up:** If the meeting notes or file are unclear or incomplete, you should ask targeted follow-up questions to ensure the information is accurate. For example:
      - "Can you clarify the deadline for this action item?"
      - "Who is responsible for this deliverable?"
      - "Are there any additional details we should add for the next milestone?"

    5. **Tailored Assistance:** As the project evolves, be sure to adapt your responses based on the type of project and the details Kim provides. Whether it’s software development, marketing, or consulting, your goal is to help Kim structure and plan efficiently.

    ### File Handling:
    - When Kim shares a file or meeting notes, immediately review the content and provide a summary of the key points as outlined above.
    - Follow up with specific actions or questions if more details are needed.
    - Example: "I've reviewed the meeting notes. Here’s a summary of the key decisions and next steps. Should we prioritize action item X for the next phase?"

    Maintain a professional and collaborative tone, but always focus on providing value through clear summaries and actionable recommendations.
    Don't write too much keep it very concise and to the point every response should be 1-2 sentences at most and always ask questions to Kim before responding to clarify. 

  `;

  try {
    let conversationHistory = sessionMemory.get(sessionId) || initialMemoryContext;

    if (hasFiles) {
      const submissionsSnapshot = await db.collection('uploadedFiles')
        .orderBy('uploadedAt', 'desc')
        .limit(1)
        .get();

      if (submissionsSnapshot.empty) {
        return res.status(404).json({ response: 'No submissions found.' });
      }

      const latestSubmissionId = submissionsSnapshot.docs[0].data().submissionId;

      const filesSnapshot = await db.collection('uploadedFiles')
        .where('submissionId', '==', latestSubmissionId)
        .get();

      let fileContents = [];
      for (const doc of filesSnapshot.docs) {
        const fileData = doc.data();

        if (fileData.name.endsWith('.txt')) {
          fileContents.push({
            fileName: fileData.name,
            content: fileData.content
          });
        }
      }

      const combinedFileContents = fileContents.map(file =>
        `File: ${file.fileName}\n${file.content}`
      ).join('\n\n');

      conversationHistory += `
        Here is the additional context from the uploaded files:
        ${combinedFileContents}
      `;

      sessionMemory.set(sessionId, conversationHistory);

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const titlePrompt = `Given these documents: ${combinedFileContents}, 
        generate a concise 3-4 word title that captures the essence of the uploaded files.`;

      const titleResult = await model.generateContent(titlePrompt);
      const title = await titleResult.response.text();

      return res.json({
        response: `${title}`,
        fileContent: fileContents
      });
    }

    conversationHistory += `User: ${text}\n`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chatPrompt = `${conversationHistory}\nAssistant:`;

    const chatResult = await model.generateContent(chatPrompt);
    const chatResponse = await chatResult.response.text();

    conversationHistory += `Assistant: ${chatResponse}\n`;

    sessionMemory.set(sessionId, conversationHistory);

    return res.json({
      response: chatResponse
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});
