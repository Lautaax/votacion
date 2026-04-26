import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Expediente, SessionConfig, Vote, UserProfile } from '../types';
import { Users, FileText, TrendingUp, TrendingDown, MinusCircle, Clock, BarChart3, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VotacionPizarra from '../components/VotacionPizarra';
import { cn } from '../lib/utils';

export default function LiveVoting({ config }: { config: SessionConfig }) {
  const [activeExpediente, setActiveExpediente] = useState<Expediente | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [totalConcejales, setTotalConcejales] = useState(0);
  const [presentConcejales, setPresentConcejales] = useState(0);

  useEffect(() => {
    if (config.activeExpedienteId) {
      const unsubExp = onSnapshot(doc(db, 'expedientes', config.activeExpedienteId), (doc) => {
        if (doc.exists()) {
          setActiveExpediente({ id: doc.id, ...doc.data() } as Expediente);
        }
      });

      const q = query(collection(db, 'votos'), where('expedienteId', '==', config.activeExpedienteId));
      const unsubVotes = onSnapshot(q, (snapshot) => {
        setVotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
      });

      return () => {
        unsubExp();
        unsubVotes();
      };
    } else {
      setActiveExpediente(null);
      setVotes([]);
    }
  }, [config.activeExpedienteId]);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'concejal')), (snapshot) => {
      const users = snapshot.docs.map(d => d.data() as UserProfile);
      setTotalConcejales(users.length);
      setPresentConcejales(users.filter(u => u.isCheckedIn).length);
    });
    return unsubUsers;
  }, []);

  useEffect(() => {
    if (config.timerEnd) {
      const interval = setInterval(() => {
        const now = Date.now();
        const end = config.timerEnd.toMillis ? config.timerEnd.toMillis() : new Date(config.timerEnd).getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
        if (diff === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [config.timerEnd]);

  const countVotes = (type: string) => votes.filter(v => v.vote === type).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Session Stats Card */}
        <div className="immersive-card p-6 flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-2 text-emerald-400 mb-4">
               <Users size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Quorum Legislativo</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-5xl font-black text-white leading-none">{presentConcejales}</span>
               <span className="text-slate-500 font-mono text-sm">/ {totalConcejales}</span>
             </div>
             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-2">{presentConcejales >= config.quorumRequired ? 'QUORUM ALCANZADO' : 'SIN QUORUM'}</p>
           </div>
           
           <div className="mt-8 space-y-3">
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(presentConcejales / totalConcejales) * 100}%` }}></div>
             </div>
             <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-500 tracking-wider">
               <span>Punto de Control</span>
               <span className="text-white font-mono">{config.nextSessionDate || 'A CONFIRMAR'}</span>
             </div>
           </div>
        </div>

        {/* Main Content Card */}
        <div className="lg:col-span-3 immersive-card p-8 relative overflow-hidden flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!config.activeExpedienteId ? (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center mb-4 text-emerald-500/30">
                  <Activity size={32} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Cámara en Receso</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-md uppercase tracking-wider font-mono text-[10px]">Aguardando el tratamiento del próximo expediente por parte de presidencia.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="active"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col md:flex-row gap-10 items-start"
              >
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse">Votación en Curso</span>
                    <span className="text-slate-500 font-mono text-xs uppercase tracking-tighter">Exp. #{activeExpediente?.id.slice(0,8)}</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white tracking-tight leading-tight">{activeExpediente?.title}</h3>
                    <p className="text-slate-400 mt-3 text-sm leading-relaxed line-clamp-3">{activeExpediente?.description}</p>
                  </div>
                  <div className="flex gap-6 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Autoría</span>
                       <span className="text-sm font-medium text-slate-200">{activeExpediente?.author}</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-6">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Escrutinio</span>
                       <span className="text-sm font-medium text-emerald-400 uppercase font-mono tracking-tighter">Sesión Ordinaria</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-center">
                       <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1 block">SI</span>
                       <span className="text-3xl font-black text-emerald-400 leading-none font-mono">{countVotes('si')}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl text-center">
                       <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1 block">NO</span>
                       <span className="text-3xl font-black text-rose-400 leading-none font-mono">{countVotes('no')}</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-center">
                       <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 block">ABS</span>
                       <span className="text-3xl font-black text-amber-400 leading-none font-mono">{countVotes('abstencion')}</span>
                    </div>
                    <div className="bg-white/2 border border-white/5 p-4 rounded-xl text-center">
                       <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">PEND</span>
                       <span className="text-3xl font-black text-slate-600 leading-none font-mono">{Math.max(0, presentConcejales - votes.length)}</span>
                    </div>
                  </div>

                  {timeLeft !== null && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                       <div>
                         <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Cronómetro</p>
                         <p className={cn("text-xl font-bold font-mono tracking-tighter", timeLeft < 10 ? "text-rose-500 animate-pulse" : "text-white")}>
                           00:{timeLeft.toString().padStart(2, '0')}
                         </p>
                       </div>
                       <Clock className="text-emerald-500/50" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <VotacionPizarra activeExpedienteId={config.activeExpedienteId} votes={votes} />
    </div>
  );
}
