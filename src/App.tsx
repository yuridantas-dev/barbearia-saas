import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AssistantPage from './pages/AssistantPage';
import AdminPage from './pages/AdminPage';
import PlatformPage from './pages/PlatformPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/saas" element={<PlatformPage />} />
        <Route path="/b/:slug" element={<AssistantPage />} />
        <Route path="/admin/:slug" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
