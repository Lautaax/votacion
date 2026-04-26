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

  const [tab, setTab] = useState<'control' | 'users'>('control');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const handleUpdateUser = async (u: UserProfile) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', u.uid), u);
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      alert("Error actualizando usuario: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    setLoading(true);
    try {
      // Note: This only deletes the profile from Firestore, not the Auth account
      // To delete Auth account, use a Cloud Function or Admin SDK
      await updateDoc(doc(db, 'users', uid), { role: 'eliminado' }); 
      // safer than deleting doc to avoid orphaned references, or just delete it:
      // await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setTab('control')}
          className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
            tab === 'control' ? "bg-emerald-500 text-black glow-emerald" : "bg-white/5 text-slate-400 hover:bg-white/10")}
        >
          Control de Sesión
        </button>
        <button 
          onClick={() => setTab('users')}
          className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
            tab === 'users' ? "bg-emerald-500 text-black glow-emerald" : "bg-white/5 text-slate-400 hover:bg-white/10")}
        >
          Gestión de Legisladores
        </button>
      </div>

      {tab === 'control' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
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
                {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : <span className="flex items-center justify-center gap-3"><BarChart3 size={18} /> Publicar y Habilitar Votación</span>}
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
        </div>
      ) : (
        <div className="immersive-card p-10 animate-in fade-in zoom-in-95">
           <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Cuerpo Legislativo</h2>
                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Administración de Bancas y Perfiles</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Usuarios</span>
                <p className="text-2xl font-black font-mono text-emerald-500">{concejales.length}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {concejales.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                  <div key={u.uid} className="bg-white/2 border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xl font-black", 
                        u.role === 'admin' ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/20 text-blue-500")}>
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200">{u.name}</h4>
                          <span className={cn("text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                            u.role === 'admin' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500")}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{u.party || 'Sin Bloque'}</p>
                        <p className="text-[9px] text-slate-600 font-mono mt-1">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u.uid)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white/2 border border-white/5 rounded-2xl p-6 sticky top-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
                    <ShieldAlert size={14} /> {editingUser ? 'Editar Perfil' : 'Nuevo Legislador (Manual)'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-600 ml-1">Nombre Completo</label>
                      <input 
                        value={editingUser?.name || ''} 
                        onChange={e => editingUser && setEditingUser({...editingUser, name: e.target.value})}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-600 ml-1">Bloque Político</label>
                      <input 
                        value={editingUser?.party || ''} 
                        onChange={e => editingUser && setEditingUser({...editingUser, party: e.target.value})}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-600 ml-1">Rol</label>
                      <select 
                        value={editingUser?.role || 'concejal'} 
                        onChange={e => editingUser && setEditingUser({...editingUser, role: e.target.value as any})}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500/50 appearance-none"
                      >
                        <option value="concejal">CONCEJAL</option>
                        <option value="admin">PRESIDENTE (ADMIN)</option>
                      </select>
                    </div>

                    {editingUser ? (
                      <div className="flex gap-2 pt-4">
                        <button 
                          onClick={() => setEditingUser(null)}
                          className="flex-1 py-3 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/5"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleUpdateUser(editingUser)}
                          className="flex-1 py-3 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest glow-emerald"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed pt-4 italic">
                        Los nuevos usuarios deben registrarse primero con su correo. Luego aparecerán aquí para ser promovidos o asignados a un bloque político.
                      </p>
                    )}
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}


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
