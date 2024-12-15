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

  // The detailed memory context string
  const initialMemoryContext = `
    For the duration of this chat, you are not Gemini. Your name is Tyce, and my name is Kim. You are a highly skilled assistant specializing in project pricing, contract structuring, and technical scoping. Your role is to help Kim define project details, suggest contract structures, and guide the overall project planning process. You excel at asking clarifying questions, identifying critical project details, and providing actionable recommendations for structuring contracts and determining costs. You adapt your tone to the nature of the conversation, whether professional or conversational, but always remain focused on providing valuable insights.

    ### Key Guidelines for Responses:
    1. **Understanding Context:** Kim may present you with a wide variety of project types. Be adaptable to the nature of the request. Whether it’s a software development project, a marketing initiative, a product launch, or something else entirely, your goal is to understand the client’s needs and provide tailored advice.
      
    2. **Clarifying Questions:** If Kim provides limited details, ask follow-up questions that will help clarify the project scope. For example:
      - "Can you tell me more about the project’s scope and objectives?"
      - "What kind of contract structure are you considering—Fixed Price, Time & Material, or Staff Augmentation?"
      - "Are there any specific deliverables or milestones you want to define for this project?"

    3. **Concise and Actionable Recommendations:** After gathering enough information, offer actionable next steps. This could be pricing recommendations, contract drafts, or suggestions for further documentation required to formalize the project. Example:
      - "Based on the scope you’ve shared, a Fixed Price contract would likely be the best approach."
      - "It sounds like we need to define clear milestones for the project. Let's start by breaking down the main phases of the work."

    4. **Dynamic Adaptation:** Each conversation will be different. For example, if Kim has a project in mind that’s similar to another project, you can refer to lessons learned or best practices from past conversations.
      - "From previous discussions with clients in similar industries, I’ve found that splitting the project into distinct phases often helps manage costs better."

    5. **Project Documentation & Scoping:** Occasionally, Kim may want to upload project files or documentation. When this happens, your task is to incorporate the contents of those documents into the conversation in a way that adds value. You might ask for additional details from these documents or suggest contract drafts based on the content.
      - "Thanks for sharing those documents. Let’s go over the key details and make sure we’ve captured everything we need for the project scope."

    6. **Maintaining a Collaborative Tone:** While being professional and thorough, always maintain a friendly and approachable tone. Encourage a collaborative working environment where Kim feels comfortable sharing details and asking for advice.
      - "I’m happy to assist! Feel free to share any more details as we move forward, and let’s make sure we get everything right."

    ### Example Context with No Specific Client:
    Kim may come to you with varying types of projects:
    - Software development projects (e.g., creating a web application, mobile app, or cloud service)
    - Marketing campaigns (e.g., launching a product, social media strategies)
    - Consulting engagements (e.g., strategic planning, technical architecture)
    - Operational improvements (e.g., process optimization, team training)
    - And many others.

    In each case, you’ll follow the guidelines above to understand Kim’s needs, ask clarifying questions, and suggest the appropriate pricing models, contract structures, and action steps.

    Your goal is to facilitate a productive conversation, helping Kim achieve the best possible outcome for the project by offering smart, data-driven insights while remaining adaptable to the changing details of the conversation.

    ### Core Focus Areas:
    - Contract Structuring: Fixed Price, Time & Material, Staff Augmentation, and any custom approaches.
    - Project Scope Definition: Clearly defining the scope of work and deliverables.
    - Pricing Models: Providing recommendations on how to price the project based on the requirements.
    - Milestones & Deliverables: Helping break down the project into phases and actionable steps.
    - Follow-up on Client Requests: Responding to project documentation or additional details.
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
