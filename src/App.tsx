/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Registration from './pages/Registration';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import Attendees from './pages/Attendees';
import Login from './pages/Login';
import UserSettings from './pages/UserSettings';
import React, { useState, useEffect } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {isAuthenticated && <Navigation />}
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Registration /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/attendees" element={<ProtectedRoute><Attendees /></ProtectedRoute>} />
            <Route path="/config" element={<ProtectedRoute><Configuration /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
