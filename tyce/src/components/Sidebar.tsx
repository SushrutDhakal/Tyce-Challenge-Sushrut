import React from 'react';
import logo from './assets/logo.png';
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import { CiFileOn } from "react-icons/ci";
import { VscGraph } from "react-icons/vsc";
import { IoSettingsOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import '../styles/sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  return (
    <div className="sidebar-container">
      <img className="sidebar-logo" src={logo} alt="logo"  onClick={() => {navigate('/');}}/>
      <IoMdAdd className="sidebar-icon" />
      <CiFileOn className="sidebar-icon" />
      <VscGraph className="sidebar-icon" />
      <IoSettingsOutline className="sidebar-icon" />
      <CgProfile className="sidebar-icon" />
    </div>
    
  );
};

export default Sidebar;
