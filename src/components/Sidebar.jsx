import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, LogOut, User as UserIcon, Users as UsersIcon, FileBarChart, ShieldCheck, Settings } from 'lucide-react';
import { cn } from '../types';

export default function Sidebar({ user, onLogout }) {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    ...(user.role === 'admin' ? [
      { to: '/funds', icon: Wallet, label: 'Funds' },
      { to: '/users', icon: UsersIcon, label: 'Users' },
      { to: '/audit-logs', icon: ShieldCheck, label: 'Audit Logs' }
    ] : []),
    ...(user.role !== 'employee' ? [
      { to: '/reports', icon: FileBarChart, label: 'Reports' }
    ] : []),
    { to: '/profile', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-black/5 flex flex-col">
      <div className="p-6 border-bottom border-black/5 flex-shrink-0">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">P</div>
          PettyCash
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-black text-white shadow-md'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              )
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-black/5 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
            <UserIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
