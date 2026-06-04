import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AssistantPage from './pages/AssistantPage';
import AdminPage from './pages/AdminPage';
import PlatformPage from './pages/PlatformPage';
import ViewportRouteSync from './components/ViewportRouteSync';

export default function App() {
  return (
    <BrowserRouter>
      <ViewportRouteSync />
      <Routes>
        <Route path="/" element={<Navigate to="/saas" replace />} />
        <Route path="/saas" element={<PlatformPage />} />
        <Route path="/b/:slug" element={<AssistantPage />} />
        <Route path="/admin/:slug" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
