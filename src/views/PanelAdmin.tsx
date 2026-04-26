import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, addDoc, getDocs, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { SessionConfig, Expediente, UserProfile } from '../types';
import { Plus, Play, Square, Save, Calendar, Users, AlertTriangle, Check, X, ShieldAlert, BarChart3, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function PanelAdmin({ config, user }: { config: SessionConfig, user: UserProfile | null }) {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [nextDate, setNextDate] = useState(config.nextSessionDate);
  const [loading, setLoading] = useState(false);
  const [concejales, setConcejales] = useState<UserProfile[]>([]);
  const [activeExp, setActiveExp] = useState<Expediente | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setConcejales(snapshot.docs.map(d => d.data() as UserProfile));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (config.activeExpedienteId) {
      const unsub = onSnapshot(doc(db, 'expedientes', config.activeExpedienteId), (doc) => {
        if (doc.exists()) setActiveExp({ id: doc.id, ...doc.data() } as Expediente);
      });
      return unsub;
    } else {
      setActiveExp(null);
    }
  }, [config.activeExpedienteId]);

  const checkedInCount = concejales.filter(c => c.isCheckedIn).length;
  const totalLegislators = concejales.filter(c => c.role === 'concejal').length;
  const quorumMet = checkedInCount >= config.quorumRequired;

  const handleCreateExpediente = async () => {
    if (!newTitle) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'expedientes'), {
        title: newTitle,
        description: newDesc,
        author: newAuthor,
        submissionDate: format(new Date(), 'dd/MM/yyyy'),
        status: 'pendiente',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'config', 'session'), { activeExpedienteId: docRef.id, timerEnd: null });
      setNewTitle(''); setNewDesc(''); setNewAuthor('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startVoting = async () => {
    setLoading(true);
    try {
      const timerEnd = new Date(Date.now() + 40000);
      await updateDoc(doc(db, 'config', 'session'), { timerEnd });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const finalizeSession = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'config', 'session'), { 
        isSessionActive: false, 
        activeExpedienteId: null,
        timerEnd: null,
        nextSessionDate: nextDate 
      });
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        await updateDoc(doc(db, 'users', d.id), { isCheckedIn: false });
      }
      setShowConfirmClose(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const manualResolution = async (status: 'aprobado' | 'rechazado') => {
    if (!config.activeExpedienteId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'expedientes', config.activeExpedienteId), { status });
      await updateDoc(doc(db, 'config', 'session'), { timerEnd: null, activeExpedienteId: null });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reactivateSession = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'config', 'session'), { isSessionActive: true });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const castAdminVote = async (option: 'si' | 'no' | 'abstencion') => {
    if (!user || !config.activeExpedienteId) return;
    setLoading(true);
    try {
      const voteId = `${config.activeExpedienteId}_${user.uid}`;
      await setDoc(doc(db, 'votos', voteId), {
        expedienteId: config.activeExpedienteId,
        userId: user.uid,
        userName: user.name + ' (Presidente)',
        vote: option,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Session Control Column */}
      <div className="xl:col-span-1 space-y-6">
        <div className="immersive-card p-6 border-emerald-500/20">
          <div className="flex items-center gap-3 text-emerald-400 mb-6">
            <ShieldAlert size={18} />
            <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono">Consola de Comando</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
               <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Estado Quórum</span>
                  <span className={cn("text-xs font-black uppercase font-mono", quorumMet ? "text-emerald-400" : "text-rose-400")}>
                    {checkedInCount} / {config.quorumRequired}+
                  </span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", quorumMet ? "bg-emerald-500" : "bg-rose-500")}
                       style={{ width: `${Math.min(100, (checkedInCount / config.quorumRequired) * 100)}%` }} />
               </div>
            </div>

            <div className="bg-white/2 border border-white/5 rounded-xl p-4">
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fecha Próxima Sesión</label>
              <input 
                type="date" 
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="bg-transparent text-white w-full outline-none font-mono text-xs uppercase"
              />
            </div>

            <div className="pt-4 border-t border-white/5 gap-3 flex flex-col">
              {config.isSessionActive ? (
                <button 
                  onClick={() => setShowConfirmClose(true)}
                  className="btn-immersive-danger w-full py-4 text-[10px] font-black uppercase"
                >
                  Cerrar Sesión Legislativa
                </button>
              ) : (
                <button 
                  onClick={reactivateSession}
                  className="btn-immersive-primary w-full py-4 text-[10px] font-black uppercase glow-emerald"
                >
                  Abrir Sesión Ordinaria
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="immersive-card p-6">
           <div className="flex items-center gap-3 text-slate-500 mb-6 font-mono text-[10px] font-bold uppercase tracking-widest">
              <Users size={16} />
              <span>Lista de Presentismo</span>
           </div>
           <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {concejales.filter(c => c.role === 'concejal').map(c => (
                <div key={c.uid} className="flex items-center justify-between py-2.5 border-b border-white/2 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-200">{c.name}</span>
                    <span className="text-[8px] uppercase font-mono text-slate-600">{c.party}</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", c.isCheckedIn ? "bg-emerald-500 glow-emerald" : "bg-slate-800")} title={c.isCheckedIn ? 'Presente' : 'Ausente'} />
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Main Control Area */}
      <div className="xl:col-span-3 space-y-6">
        <div className="immersive-card p-8 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/10">
          <div className="flex items-center gap-3 text-emerald-400 mb-8 border-b border-white/5 pb-6">
             <Plus size={20} />
             <h2 className="text-xl font-bold uppercase tracking-tight">Tratamiento de Nuevo Expediente</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-6">
              <div className="space-y-1.5 focus-within:text-emerald-400 transition-colors">
                <label className="text-[9px] font-bold uppercase tracking-widest ml-1">Título de la Ordenanza</label>
                <input 
                  placeholder="Ej: Reforma de Movilidad Urbana..." 
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-widest ml-1">Autor / Bloque Legislativo</label>
                <input 
                  placeholder="Ej: Bloque Político..." 
                  value={newAuthor} onChange={e => setNewAuthor(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest ml-1">Descripción del Cuerpo</label>
              <textarea 
                placeholder="Detalle los puntos clave del proyecto..." 
                value={newDesc} onChange={e => setNewDesc(e.target.value)}
                className="w-full h-[154px] bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-emerald-500/50 outline-none transition-all resize-none"
              />
            </div>
          </div>
          
          <button 
            onClick={handleCreateExpediente}
            disabled={loading || !newTitle || !config.isSessionActive}
            className="btn-immersive-primary w-full py-5 text-xs font-black uppercase tracking-[0.2em] glow-emerald"
          >
            {loading ? <Activity className="animate-spin" /> : <span className="flex items-center gap-3"><BarChart3 size={18} /> Publicar y Habilitar Votación</span>}
          </button>
        </div>

        {activeExp && (
          <div className="immersive-card p-10 border-emerald-500/40 glow-emerald relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 font-mono uppercase tracking-widest">Control en Vivo de Votación</span>
                </div>
                <h3 className="text-3xl font-bold text-white tracking-tight">{activeExp.title}</h3>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Activo bajo ID legislativo: #{activeExp.id.slice(0, 12)}</p>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <button 
                  onClick={startVoting}
                  disabled={loading || !!config.timerEnd}
                  className="btn-immersive-primary px-8 py-4 text-[11px] font-black uppercase glow-emerald"
                >
                  <Play size={18} className="mr-2 inline" /> Iniciar Timer 40s
                </button>
                <div className="flex gap-2">
                   <button 
                     onClick={() => castAdminVote('si')} 
                     className="flex-1 py-3 text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20"
                   >
                     VOTO SI
                   </button>
                   <button 
                     onClick={() => castAdminVote('no')} 
                     className="flex-1 py-3 text-[9px] font-black uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20"
                   >
                     VOTO NO
                   </button>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4">
               <button 
                 onClick={() => manualResolution('aprobado')} 
                 className="py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl glow-emerald flex items-center justify-center gap-3"
               >
                 <Check size={20} /> Resolución: Aprobado
               </button>
               <button 
                 onClick={() => manualResolution('rechazado')} 
                 className="py-5 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl glow-rose flex items-center justify-center gap-3"
               >
                 <X size={20} /> Resolución: Rechazado
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Confirm Close */}
      <AnimatePresence>
        {showConfirmClose && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
               className="immersive-card max-w-md w-full p-10 text-center border-rose-500/30"
             >
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                   <AlertTriangle size={48} />
                </div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">¿Finalizar la Sesión?</h3>
                <p className="text-slate-500 text-sm font-mono text-[10px] uppercase tracking-wider mb-8 leading-relaxed">
                   Esta acción interrumpirá toda actividad legislativa, archivará el expediente en curso y reseteará el presentismo de las bancas.
                </p>
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setShowConfirmClose(false)} 
                     className="py-4 border border-white/10 text-slate-500 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                   >
                     Cerrar
                   </button>
                   <button 
                     onClick={finalizeSession} 
                     className="py-4 bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl glow-rose active:scale-95 transition-all"
                   >
                     Confirmar Cierre
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
