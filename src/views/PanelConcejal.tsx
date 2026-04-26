import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { UserProfile, SessionConfig, Vote, Expediente } from '../types';
import { CheckCircle2, XCircle, MinusCircle, UserCheck, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function PanelConcejal({ config, user }: { config: SessionConfig, user: UserProfile | null }) {
  const [activeExpediente, setActiveExpediente] = useState<Expediente | null>(null);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (config.activeExpedienteId) {
      const unsubExp = onSnapshot(doc(db, 'expedientes', config.activeExpedienteId), (doc) => {
        if (doc.exists()) setActiveExpediente({ id: doc.id, ...doc.data() } as Expediente);
      });

      if (user) {
        const q = query(collection(db, 'votos'), where('expedienteId', '==', config.activeExpedienteId), where('userId', '==', user.uid));
        const unsubVote = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) setMyVote({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vote);
          else setMyVote(null);
        });
        return () => { unsubExp(); unsubVote(); };
      }
      return unsubExp;
    } else {
      setActiveExpediente(null);
      setMyVote(null);
    }
  }, [config.activeExpedienteId, user]);

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

  const castVote = async (option: 'si' | 'no' | 'abstencion') => {
    if (!user || !activeExpediente || myVote || (timeLeft !== null && timeLeft === 0)) return;
    setLoading(true);
    try {
      const voteId = `${activeExpediente.id}_${user.uid}`;
      await setDoc(doc(db, 'votos', voteId), {
        expedienteId: activeExpediente.id,
        userId: user.uid,
        userName: user.name,
        vote: option,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { isCheckedIn: true });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Profil Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-white tracking-tight">Terminal Legislativa</h2>
          <div className="flex items-center gap-3">
             <span className="text-emerald-500 font-mono text-[10px] font-bold uppercase tracking-widest">ID: {user.uid.slice(0, 8)}</span>
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
        
        <div className="immersive-card px-6 py-4 flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center glow-emerald shrink-0">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider leading-none">{user.name}</p>
            <p className="text-[9px] font-mono text-emerald-400 mt-1 uppercase tracking-widest">{user.party}</p>
          </div>
        </div>
      </div>

      {!user.isCheckedIn ? (
        <div className="immersive-card p-12 text-center flex flex-col items-center space-y-6">
           <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
             <UserCheck size={40} />
           </div>
           <div className="space-y-2">
             <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Dar el Presente</h3>
             <p className="text-slate-500 max-w-sm mx-auto text-sm font-mono text-[10px] uppercase tracking-wider leading-relaxed">Debe registrar su presencia en la banca para habilitar el panel de votación activo.</p>
           </div>
           <button 
             onClick={handleCheckIn}
             className="btn-immersive-primary px-12 py-4 text-base glow-emerald"
           >
             Registrar Ingreso al Recinto
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voting View */}
          <div className="space-y-8">
            <div className="immersive-card p-8 border-emerald-500/20">
              <div className="flex items-center gap-3 text-emerald-400 mb-6 border-b border-white/5 pb-4">
                <Clock size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Control en Tiempo Real</span>
              </div>

              {!activeExpediente ? (
                <div className="py-12 text-center">
                   <div className="w-12 h-12 rounded-full bg-white/2 border border-white/5 flex items-center justify-center mx-auto mb-4 text-slate-800">
                     <Clock size={24} />
                   </div>
                   <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-none">Aguardando nuevo expediente...</p>
                </div>
              ) : (
                <div className="space-y-8">
                   <div className="space-y-2">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-tighter">Exp. #{activeExpediente.id.slice(0, 8)}</span>
                         {timeLeft !== null && (
                            <span className={cn("font-mono text-lg font-bold", timeLeft < 10 ? "text-rose-500 animate-pulse" : "text-white")}>
                              00:{timeLeft.toString().padStart(2, '0')}
                            </span>
                         )}
                      </div>
                      <h4 className="text-xl font-bold text-white leading-tight">{activeExpediente.title}</h4>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                     <button
                       disabled={loading || !!myVote || timeLeft === 0}
                       onClick={() => castVote('si')}
                       className={cn(
                         "flex items-center justify-between p-5 rounded-xl border transition-all active:scale-95 group",
                         myVote?.vote === 'si' 
                           ? "bg-emerald-600 border-emerald-400 text-white glow-emerald" 
                           : "bg-white/5 border-white/10 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                       )}
                     >
                       <span className="font-black tracking-widest text-lg">AFIRMATIVO</span>
                       <CheckCircle2 size={24} />
                     </button>

                     <button
                       disabled={loading || !!myVote || timeLeft === 0}
                       onClick={() => castVote('no')}
                       className={cn(
                         "flex items-center justify-between p-5 rounded-xl border transition-all active:scale-95 group",
                         myVote?.vote === 'no' 
                           ? "bg-rose-600 border-rose-400 text-white glow-rose" 
                           : "bg-white/5 border-white/10 text-rose-500 hover:bg-rose-600/10 hover:border-rose-600/30"
                       )}
                     >
                       <span className="font-black tracking-widest text-lg">NEGATIVO</span>
                       <XCircle size={24} />
                     </button>

                     <button
                       disabled={loading || !!myVote || timeLeft === 0}
                       onClick={() => castVote('abstencion')}
                       className={cn(
                         "flex items-center justify-between p-5 rounded-xl border transition-all active:scale-95 group",
                         myVote?.vote === 'abstencion' 
                           ? "bg-amber-600 border-amber-400 text-white glow-amber" 
                           : "bg-white/5 border-white/10 text-amber-500 hover:bg-amber-600/10 hover:border-amber-600/30"
                       )}
                     >
                       <span className="font-black tracking-widest text-lg">ABSTENCIÓN</span>
                       <MinusCircle size={24} />
                     </button>
                   </div>
                   
                   {myVote && (
                     <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                          Su voto "{myVote.vote.toUpperCase()}" ha sido registrado en acta.
                        </p>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column / Context */}
          <div className="space-y-8">
             <div className="immersive-card p-6">
                <div className="flex items-center gap-3 text-slate-500 mb-6 border-b border-white/5 pb-4">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Reglamento Interno</span>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Estado del Presente</span>
                     <span className="text-xs font-bold text-emerald-400 uppercase">POSITIVO</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Carácter del Voto</span>
                     <span className="text-xs font-bold text-white uppercase tracking-tighter">PÚBLICO Y NOMINAL</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Mayoría Requerida</span>
                     <span className="text-xs font-bold text-slate-300 uppercase leading-none text-right">SEGÚN EXPEDIENTE</span>
                   </div>
                </div>
             </div>

             <div className="immersive-card p-8 bg-emerald-950/10 border-emerald-500/10">
                <h5 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Información Parlamentaria</h5>
                <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4 py-1">
                  "El voto emitido por este medio electrónico será consignado en el diario de sesiones como expresión oficial de su voluntad legislativa. Las abstenciones sólo procederán bajo los motivos estipulados en el art. 54."
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
