import React, { useState, useEffect } from 'react';
import { Activity, Radio, User, ShieldCheck, History, Vote, Menu, X } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface HeaderProps {
  currentView: string;
  setView: (v: any) => void;
  user: UserProfile | null;
}

export default function Header({ currentView, setView, user }: HeaderProps) {
  const [latency, setLatency] = useState(22);
  const [status, setStatus] = useState<'Connected' | 'Connecting' | 'Disconnected'>('Connected');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 10) + 18);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'live', label: 'Votación en Vivo', icon: Radio },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'councilor', label: 'Portal Concejal', icon: User, hidden: user && user.role !== 'concejal' && user.role !== 'admin' },
    { id: 'admin', label: 'Administración', icon: ShieldCheck, hidden: user?.role !== 'admin' },
  ];

  return (
    <header className="h-16 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('live')}>
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Vote className="text-white w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight uppercase text-white leading-none">Sistema de Transparencia</h1>
            <p className="text-[9px] text-slate-500 font-mono mt-1">CONCEJO DELIBERANTE — SESIÓN ACTIVA</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 ml-4 border-l border-white/10 pl-6">
          {navItems.filter(i => !i.hidden).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
                currentView === item.id 
                  ? "text-emerald-400 bg-emerald-500/10" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-mono text-emerald-400 tracking-wide">REALTIME: {latency}ms</span>
        </div>

        {user ? (
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-bold text-white uppercase leading-none">{user.name}</p>
              <p className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-tighter">{user.party}</p>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all font-mono text-[10px]"
            >
              {user.name.charAt(0)}
            </button>
          </div>
        ) : (
          <button onClick={() => setView('live')} className="text-[10px] font-bold text-slate-500 hover:text-emerald-400 uppercase tracking-widest">
            Acceso Autorizado
          </button>
        )}

        <button className="lg:hidden text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 border-b border-white/10 bg-[#0a0a0a] p-4 flex flex-col gap-2 shadow-2xl">
          {navItems.filter(i => !i.hidden).map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setIsMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-[11px] font-bold uppercase text-slate-400"
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
