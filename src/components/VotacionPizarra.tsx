import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { UserProfile, Vote } from '../types';
import { motion } from 'motion/react';
import { Shield, Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface PizarraProps {
  activeExpedienteId: string | null;
  votes: Vote[];
}

export default function VotacionPizarra({ activeExpedienteId, votes }: PizarraProps) {
  const [concejales, setConcejales] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
      
      const sorted = [...users].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.name.localeCompare(b.name);
      });
      setConcejales(sorted);
    });
    return unsub;
  }, []);

  const getVoteStatus = (userId: string) => {
    const vote = votes.find(v => v.userId === userId);
    return vote ? vote.vote : 'pending';
  };

  return (
    <div className="immersive-card p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Pizarra Legislativa</h2>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mt-1">Escrutinio nominal en tiempo real</p>
        </div>
        <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 glow-emerald" /> AFIRMATIVO</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 glow-rose" /> NEGATIVO</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500 glow-amber" /> ABSTENCIÓN</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700" /> PENDIENTE</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {concejales.map((concejal, idx) => {
          const status = getVoteStatus(concejal.uid);
          return (
            <motion.div
              key={concejal.uid}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "relative p-4 rounded-xl border transition-all duration-700",
                status === 'si' ? "bg-emerald-500/5 border-emerald-500/30 glow-emerald" :
                status === 'no' ? "bg-rose-500/5 border-rose-500/30 glow-rose" :
                status === 'abstencion' ? "bg-amber-500/5 border-amber-500/30 glow-amber" :
                "bg-white/2 border-white/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm relative transition-colors duration-500",
                  status === 'si' ? "bg-emerald-600 text-white" :
                  status === 'no' ? "bg-rose-600 text-white" :
                  status === 'abstencion' ? "bg-amber-600 text-white" :
                  "bg-white/5 text-slate-500 border border-white/10"
                )}>
                  {concejal.role === 'admin' ? <Shield size={18} /> : concejal.name.charAt(0)}
                  {concejal.isBloquePresident && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black p-0.5 rounded-full ring-2 ring-[#0a0a0a]">
                      <Star size={8} fill="black" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={cn(
                    "font-bold text-xs uppercase truncate leading-none",
                    status === 'pending' ? "text-slate-400" : "text-white"
                  )}>
                    {concejal.name}
                  </p>
                  <p className="text-[9px] uppercase text-slate-600 font-mono mt-1.5 truncate">
                    {concejal.party}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                 <span className={cn(
                   "text-[9px] font-black uppercase tracking-tighter",
                   status === 'si' ? "text-emerald-400" :
                   status === 'no' ? "text-rose-400" :
                   status === 'abstencion' ? "text-amber-400" :
                   "text-slate-700"
                 )}>
                   {status === 'pending' ? 'ESPERANDO' : status.toUpperCase()}
                 </span>
                 {concejal.role === 'admin' && (
                   <span className="text-[7px] bg-slate-800 text-slate-500 px-1 rounded uppercase font-bold tracking-widest">Presid.</span>
                 )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
