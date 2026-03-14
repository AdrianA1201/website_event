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
import VotingAdmin from './pages/VotingAdmin';
import VoterPage from './pages/VoterPage';
import RandomTools from './pages/RandomTools';
import Login from './pages/Login';
import UserSettings from './pages/UserSettings';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

function ProtectedRoute({ children, isAuthenticated, loading }: { children: React.ReactNode, isAuthenticated: boolean, loading: boolean }) {
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {isAuthenticated && <Navigation />}
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><Registration /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><Dashboard /></ProtectedRoute>} />
            <Route path="/attendees" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><Attendees /></ProtectedRoute>} />
            <Route path="/voting-admin" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><VotingAdmin /></ProtectedRoute>} />
            <Route path="/random" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><RandomTools /></ProtectedRoute>} />
            <Route path="/vote" element={<VoterPage />} />
            <Route path="/config" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><Configuration /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}><UserSettings /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
