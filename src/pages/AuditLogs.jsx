import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';

export default function AuditLogs({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/audit-logs');
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (user.role !== 'admin') return <div className="p-8">Access Denied</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-zinc-500 mt-1">Track all system activities and administrative actions.</p>
      </header>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                    {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-zinc-400" />
                      <span className="text-sm font-semibold">{log.user_name || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-[10px] font-bold uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
