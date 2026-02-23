import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function Profile({ user }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      toast.success('Password updated successfully');
      setSuccess('Password updated successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Password update error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account security and preferences.</p>
      </header>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-zinc-100">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{user.name}</h3>
            <p className="text-zinc-500">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Lock size={20} className="text-zinc-400" />
            Change Password
          </h4>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-emerald-100">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
