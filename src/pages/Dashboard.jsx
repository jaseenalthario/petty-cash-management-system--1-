import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Receipt, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <div>Loading dashboard...</div>;

  const cards = [
    {
      label: 'Available Liquidity',
      value: `AED ${stats?.availableLiquidity.toLocaleString()}`,
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
      trend: '+2.4%',
      trendUp: true
    },
    {
      label: 'Total Expenses',
      value: `AED ${stats?.totalApprovedExpenses.toLocaleString()}`,
      icon: Receipt,
      color: 'bg-blue-50 text-blue-600',
      trend: '-1.2%',
      trendUp: false
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests.toString(),
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      trend: 'Action required',
      trendUp: null
    }
  ];

  const COLORS = ['#000000', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-zinc-500 mt-1">Welcome back, {user.name}. Here's what's happening today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${card.color}`}>
                <card.icon size={24} />
              </div>
              {card.trendUp !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold ${card.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {card.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">Spending by Category</h3>
            <button className="text-sm text-zinc-500 hover:text-black font-medium">View Report</button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                  {stats?.categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm flex flex-col"
        >
          <h3 className="text-lg font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <button 
              onClick={() => navigate('/expenses', { state: { openModal: true } })}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-all group"
            >
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Receipt className="text-black" size={24} />
              </div>
              <span className="text-sm font-bold">New Expense</span>
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-all group"
            >
              <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <TrendingUp className="text-black" size={24} />
              </div>
              <span className="text-sm font-bold">View Reports</span>
            </button>
            {user.role === 'admin' && (
              <>
                <button 
                  onClick={() => navigate('/funds')}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Wallet className="text-black" size={24} />
                  </div>
                  <span className="text-sm font-bold">Manage Funds</span>
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <UserPlus className="text-black" size={24} />
                  </div>
                  <span className="text-sm font-bold">Register User</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
