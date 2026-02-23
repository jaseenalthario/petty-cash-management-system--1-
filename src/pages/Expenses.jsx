import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Filter, CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, X, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { cn } from '../types';
import { format } from 'date-fns';

export default function Expenses({ user }) {
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    fund_id: '',
    amount: '',
    category: 'Travel',
    description: '',
    receipt: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
    }
  }, [location.state]);

  const categories = ['Travel', 'Meals', 'Office Supplies', 'Maintenance', 'Entertainment', 'Other'];

  const fetchExpenses = async () => {
    try {
      const { data } = await api.get('/expenses');
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    }
  };

  const fetchFunds = async () => {
    try {
      const { data } = await api.get('/funds');
      setFunds(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, fund_id: data[0].id.toString() }));
    } catch (err) {
      console.error('Failed to fetch funds', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchFunds()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('fund_id', formData.fund_id);
    data.append('amount', formData.amount);
    data.append('category', formData.category);
    data.append('description', formData.description);
    if (formData.receipt) data.append('receipt', formData.receipt);

    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingExpense) {
        await api.patch(`/expenses/${editingExpense.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/expenses', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowModal(false);
      setEditingExpense(null);
      toast.success(editingExpense ? 'Expense updated' : 'Expense submitted');
      setFormData({ fund_id: funds[0]?.id.toString() || '', amount: '', category: 'Travel', description: '', receipt: null });
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      fund_id: expense.fund_id.toString(),
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      receipt: null
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/expenses/${id}/status`, { status });
      toast.success(`Expense ${status}`);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'rejected': return <XCircle className="text-red-500" size={18} />;
      default: return <Clock className="text-amber-500" size={18} />;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-zinc-500 mt-1">Track and manage all petty cash requests.</p>
        </div>
        {user.role === 'employee' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus size={20} />
            New Request
          </button>
        )}
      </header>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search expenses..."
              className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Receipt</th>
                {user.role !== 'employee' && (
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {format(new Date(expense.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                        {expense.employee_name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold">{expense.employee_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold">
                    AED {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium capitalize">
                      {getStatusIcon(expense.status)}
                      {expense.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {expense.receipt_url ? (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-black transition-colors"
                      >
                        <ImageIcon size={18} />
                      </a>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  {user.role === 'employee' ? (
                    <td className="px-6 py-4 text-right">
                      {expense.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  ) : (
                    <td className="px-6 py-4 text-right">
                      {expense.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStatusUpdate(expense.id, 'approved')}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(expense.id, 'rejected')}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-zinc-400 uppercase">Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{editingExpense ? 'Edit Request' : 'New Expense Request'}</h2>
                <button onClick={() => { setShowModal(false); setEditingExpense(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Select Fund</label>
                    <select
                      value={formData.fund_id}
                      onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    >
                      {funds.map(f => (
                        <option key={f.id} value={f.id}>{f.fund_name} (AED {f.remaining_amount})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Amount (AED)</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                          formData.category === cat
                            ? "bg-black text-white border-black"
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all h-24 resize-none"
                    placeholder="What was this expense for?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Receipt Image</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, receipt: e.target.files?.[0] || null })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full p-8 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-black transition-all bg-zinc-50">
                      <FileText className="text-zinc-400 group-hover:text-black transition-colors" size={32} />
                      <p className="text-sm font-medium text-zinc-500">
                        {formData.receipt ? formData.receipt.name : 'Click or drag to upload receipt'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (editingExpense ? 'Updating...' : 'Submitting...') : (editingExpense ? 'Update Request' : 'Submit Request')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
