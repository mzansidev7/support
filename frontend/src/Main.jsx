import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import LoginPage from "./components/login/LoginPage";
import Dashboard from "./components/dashboard/Dashboard";

const Main = () => {
  const [selectedTab, setSelectedTab] = useState("")
  
  useEffect(() => {
    
    return () => {
      
    }
  }, [])
  
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default Main