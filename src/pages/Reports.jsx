import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Filter, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../services/api';

export default function Reports({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const COLORS = ['#000000', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

  const handleDownload = () => {
    // Mock download
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Category,Total\n"
      + stats?.categoryStats.map(s => `${s.category},${s.total}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "petty_cash_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (user.role === 'employee') return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-zinc-500 mt-1">Analyze spending patterns and fund utilization.</p>
        </div>
        <button
          onClick={handleDownload}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
        >
          <Download size={20} />
          Export CSV
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
            <PieChartIcon size={20} className="text-zinc-400" />
            Spending Distribution
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="category"
                >
                  {stats?.categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
          >
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Summary Stats</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Total Approved</span>
                <span className="font-bold">AED {stats?.totalApprovedExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Available Funds</span>
                <span className="font-bold">AED {stats?.availableLiquidity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Pending Requests</span>
                <span className="font-bold">{stats?.pendingRequests}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
          >
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Report Filters</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500">Date Range</label>
                <button className="w-full flex items-center justify-between px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                  <span>Last 30 Days</span>
                  <Calendar size={16} className="text-zinc-400" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500">Category</label>
                <button className="w-full flex items-center justify-between px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                  <span>All Categories</span>
                  <Filter size={16} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
