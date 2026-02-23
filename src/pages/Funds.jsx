import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Wallet, X, Trash2, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { cn } from '../types';
import { format } from 'date-fns';

export default function Funds({ user }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(null);
  const [formData, setFormData] = useState({
    fund_name: '',
    total_amount: ''
  });
  const [topupAmount, setTopupAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFunds = async () => {
    try {
      const { data } = await api.get('/funds');
      setFunds(data);
    } catch (err) {
      console.error('Failed to fetch funds', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post('/funds', {
        fund_name: formData.fund_name,
        total_amount: parseFloat(formData.total_amount)
      });
      setShowModal(false);
      setFormData({ fund_name: '', total_amount: '' });
      toast.success('Fund created successfully');
      fetchFunds();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!showTopupModal || submitting) return;
    setSubmitting(true);
    try {
      await api.patch(`/funds/${showTopupModal.id}/topup`, {
        amount: parseFloat(topupAmount)
      });
      setShowTopupModal(null);
      setTopupAmount('');
      toast.success('Fund topped up');
      fetchFunds();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to top up fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fund? This will also delete all associated expenses.')) return;
    try {
      await api.delete(`/funds/${id}`);
      toast.success('Fund deleted');
      fetchFunds();
    } catch (err) {
      toast.error('Failed to delete fund');
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4">
          <X size={32} />
        </div>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-zinc-500">Only administrators can manage funds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Petty Cash Funds</h1>
          <p className="text-zinc-500 mt-1">Manage organizational cash pools and limits.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Create New Fund
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map((fund, i) => {
          const percentage = (fund.remaining_amount / fund.total_amount) * 100;
          return (
            <motion.div
              key={fund.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                  <Wallet size={24} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Remaining</p>
                  <p className="text-xl font-bold">AED {fund.remaining_amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{fund.fund_name}</h3>
                  <p className="text-sm text-zinc-500">Created {format(new Date(fund.created_at), 'MMM dd, yyyy')}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-400">Utilization</span>
                    <span className={cn(
                      percentage < 20 ? "text-red-600" : "text-zinc-600"
                    )}>{Math.round(100 - percentage)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - percentage}%` }}
                      className={cn(
                        "h-full transition-all duration-1000",
                        percentage < 20 ? "bg-red-500" : "bg-black"
                      )}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-zinc-400">Initial: </span>
                    <span className="font-bold">AED {fund.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTopupModal(fund)}
                      className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                      title="Top up"
                    >
                      <TrendingUp size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(fund.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create New Fund</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Fund Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fund_name}
                    onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="e.g. Office Petty Cash Q1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Initial Amount (AED)</label>
                  <input
                    type="number"
                    required
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="5000.00"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Fund'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTopupModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Top up Fund</h2>
                <button onClick={() => setShowTopupModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleTopup} className="space-y-6">
                <div className="p-4 bg-zinc-50 rounded-2xl mb-4">
                  <p className="text-sm text-zinc-500">Fund Name</p>
                  <p className="font-bold">{showTopupModal.fund_name}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Top up Amount (AED)</label>
                  <input
                    type="number"
                    required
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="1000.00"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Updating...' : 'Confirm Top up'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
