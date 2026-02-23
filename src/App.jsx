/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Funds from './pages/Funds';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
        {user ? (
          <div className="flex">
            <Sidebar user={user} onLogout={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }} />
            <main className="flex-1 p-8 ml-64">
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/expenses" element={<Expenses user={user} />} />
                <Route path="/funds" element={<Funds user={user} />} />
                <Route path="/users" element={<Users user={user} />} />
                <Route path="/reports" element={<Reports user={user} />} />
                <Route path="/audit-logs" element={<AuditLogs user={user} />} />
                <Route path="/profile" element={<Profile user={user} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={(u) => setUser(u)} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      </div>
    </Router>
  );
}

