import React, { useEffect, useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { responseAtom, intialPromptAtom } from './atoms';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import axios from 'axios';
import { FaArrowCircleUp } from "react-icons/fa";
import { CgProfile } from "react-icons/cg";
import logo from './assets/logo.png';
import '../styles/chat.css';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for session tracking

const Chat: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
  const [response] = useAtom(responseAtom);
  const [intialPrompt] = useAtom(intialPromptAtom);
  const [sessionId, setSessionId] = useState<string>(() => {
    let id = localStorage.getItem('chatSessionId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('chatSessionId', id);
    }
    return id;
  });

  const navigate = useNavigate();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    if (intialPrompt.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'user', text: intialPrompt }
      ]);

      const sendInitialQuery = async () => {
        try {
          const response = await axios.post('http://localhost:5000/api/chat', {
            text: intialPrompt,
            sessionId,
            hasFiles: false,
          });

          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'tyce', text: response.data.response }
          ]);
        } catch (error) {
          console.error('Error communicating with the backend:', error);
        }
      };

      sendInitialQuery();
    }

    hasRunRef.current = true;
  }, [intialPrompt, sessionId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userInput.trim()) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: userInput }
    ]);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        text: userInput,
        sessionId,
        hasFiles: false,
      });

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'tyce', text: response.data.response }
      ]);

      setUserInput('');
    } catch (error) {
      console.error('Error communicating with the backend:', error);
    }
  };

  const handleBackToMain = () => {
    localStorage.removeItem('chatSessionId'); // Clear the session ID
    setSessionId(uuidv4()); // Generate a new session ID for the next chat
    setMessages([]); // Clear the chat messages
    navigate('/'); // Navigate to the main page
  };

  return (
    <div className="main-container">
      <Sidebar />
      <div className="chat-container">
        <div className="title-container">
          <h1 className="title">{response || 'Unknown Topic'}</h1>
        </div>

        <div className="conversation-window">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="sender-info">
                {message.sender === 'user' ? (
                  <CgProfile className="user" />
                ) : (
                  <img className="tyce" src={logo} alt="logo" />
                )}
              </div>
              <span>{message.text}</span>
            </div>
          ))}
        </div>

        <div className='input-container'>
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="input-field"
            />
            <button type="submit" className="send-button"><FaArrowCircleUp /></button>
          </form>
        </div>

        <button onClick={handleBackToMain} className="back-button">Back to Main</button>
      </div>
    </div>
  );
};

export default Chat;
