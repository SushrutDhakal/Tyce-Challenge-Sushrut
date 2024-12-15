import React, { useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { collection, addDoc } from 'firebase/firestore';
import { responseAtom, intialPromptAtom  } from './atoms';
import { db } from '../firebase-config';
import Sidebar from './Sidebar';
import logo from './assets/logo.png';
import { PiTelegramLogoDuotone } from "react-icons/pi";
import { GoPaperclip } from "react-icons/go";
import { IoIosArrowUp } from "react-icons/io";
import { MdKeyboardArrowDown } from "react-icons/md";
import { CiFileOn } from "react-icons/ci";
import '../styles/home.css';

const buttons = [
  { label: 'RFP' },
  { label: 'Pricing' },
  { label: 'Marketing' },
  { label: 'Contact' },
];

const deals = [
  {
    name: 'App Development',
    revenue: '$1M',
    number: 6,
    industry: 'Banking',
  },
  {
    name: 'ERP',
    revenue: '$5M',
    number: 10,
    industry: 'Banking',
  },
  {
    name: 'AI POCs',
    revenue: '$1M',
    number: 7,
    industry: 'Industrial',
  },
];

function Home() {
  const [dealsDisplay, setDealsDisplay] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [inputText, setInputText] = useState('');
  const [responseText, setResponse] = useAtom(responseAtom);
  const [intialPrompt, setIntialPrompt] = useAtom(intialPromptAtom)
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      console.log("No files uploaded");
      navigate('/chat');
    }
  
    const fileCollection = collection(db, 'uploadedFiles');
    const submissionId = uuidv4();

    try {
      for (const file of files) {
        const textContent = await file.text();
        await addDoc(fileCollection, {
          name: file.name,
          content: textContent,
          submissionId: submissionId,
          uploadedAt: new Date(),
        });
      }
      console.log("Submitted");
  
      const response = await axios.post('http://localhost:5000/api/chat', { 
        text: inputText,
        hasFiles: true
      });
  
      setResponse(response.data.response);
      setInputText('');
      setFiles([]);
      navigate('/chat');
    } catch (error) {
      console.error('Error submitting files:', error);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleDeleteFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="main-container">
        <Sidebar />
        <div className="title-container">
          <h1 className="title">New Project</h1>
        </div>
        <img className="logo" src={logo} alt="logo"/>
        <div className="greeting-container">
          <h2>Hi Kim, I'm Tyce, your Sales Partner.</h2>
          <h2>I'm here to help you sell projects</h2>
          <h3>What do you need assistance with today?</h3>
        </div>
        <div className="preset-button-container">
          {buttons.map((button, index) => (
            <button className="button" key={index}>{button.label}</button>
          ))}
        </div>

        <div className="chatbot-container">
          <div className="intial-prompt">
            <form className="prompt" onSubmit={handleSubmit}>
              <textarea
                id="input"
                className="textarea"
                placeholder="Let me know how I can help you!"
                value={intialPrompt}
                onChange={(e) => setIntialPrompt(e.target.value)}
              />
              <button type="submit" className="submit-chat">
                  <PiTelegramLogoDuotone size={20}/>
              </button>
            </form>
          </div>
          <div className={`upload-files ${files && files.length > 0 ? 'has-files' : 'no-files'}`}>

            <form className="file-upload-form">
              <label htmlFor="file-input" className="upload-button">
                Add documents (meeting notes, client briefings) to start a new project
              </label>
              <input
                type="file"
                id="file-input"
                accept=".docx, .txt"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button type="submit" className="paperclip">
                <GoPaperclip  size={18}/>
              </button>
            </form>

            {files.length > 0 && (
              <div className="uploaded-files-container">
                {files.map((file, index) => (
                  <div key={index} className="uploaded-file">
                    <span className="file-icon"><CiFileOn /></span>
                    <span className="file-name">{file.name}</span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteFile(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="deals-intro">
          <h4>Top deals this quarter</h4>
          <button onClick={() => setDealsDisplay(!dealsDisplay)}>
            {dealsDisplay ? <IoIosArrowUp /> : <MdKeyboardArrowDown />}
          </button>
        </div>

        {dealsDisplay && (
          <div className="deals-container">
            {deals.map((deal) => (
              <div className="deal-card" key={deal.name}>
                {deal.name}
                <div className="center-info">
                  <div className="inner">
                    <h5>{deal.number}</h5>
                    <h6>Deals</h6>
                  </div>
                  <div className="inner">
                    <h5>{deal.revenue}</h5>
                    <h6>Revenue</h6>
                  </div>
                </div>
                <div className="deal-industry">
                  <h5>{deal.industry}</h5>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Home;
