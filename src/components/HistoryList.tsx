import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Expediente, Vote } from '../types';
import { FileText, Download, ChevronDown, Check, X, Users, Table, Loader2, Clock, MapPin, Activity } from 'lucide-react';
// PDF export is temporarily disabled due to library conflict
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function HistoryList({ expedientes }: { expedientes: Expediente[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVotes = async (expId: string) => {
    if (expandedId === expId) {
      setExpandedId(null);
      return;
    }
    setLoading(true);
    setExpandedId(expId);
    try {
      const q = query(collection(db, 'votos'), where('expedienteId', '==', expId));
      const snap = await getDocs(q);
      setDetails(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportActaPDF = async (exp: Expediente) => {
    alert("Exportación deshabilitada momentáneamente por mantenimiento de librerías.");
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {expedientes.map((exp, idx) => (
          <motion.div 
            key={exp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="immersive-card overflow-hidden group"
          >
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                  exp.status === 'aprobado' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500 glow-emerald" : 
                  exp.status === 'rechazado' ? "bg-rose-500/5 border-rose-500/20 text-rose-500 glow-rose" : "bg-white/2 border-white/5 text-slate-700"
                )}>
                  {exp.status === 'aprobado' ? <Check size={28} strokeWidth={3} /> : exp.status === 'rechazado' ? <X size={28} strokeWidth={3} /> : <Clock size={28} />}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white leading-tight uppercase tracking-tight">{exp.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                    <span className="text-emerald-500 font-bold uppercase tracking-widest">#{exp.id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1.5 text-slate-500 uppercase"><MapPin size={12} /> {exp.author}</span>
                    <span className="text-slate-600">{exp.submissionDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => exportActaPDF(exp)} 
                  className="p-3 rounded-xl bg-white/2 border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all active:scale-95" 
                  title="Descargar Acta PDF"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => fetchVotes(exp.id)} 
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
                    expandedId === exp.id 
                      ? "bg-emerald-600 text-white glow-emerald" 
                      : "bg-white/2 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  AUDITAR <ChevronDown size={14} className={cn("transition-transform duration-500", expandedId === exp.id && "rotate-180")} />
                </button>
              </div>
            </div>

            {expandedId === exp.id && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5 bg-[#0a0a0b]/40 overflow-hidden"
              >
                <div className="p-8">
                  {loading ? (
                    <div className="flex justify-center p-12"><Activity className="animate-spin text-emerald-500/30" size={32} /></div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-slate-600 tracking-widest font-mono">Fundamentación del Proyecto</h4>
                            <p className="text-sm text-slate-400 leading-relaxed font-sans">{exp.description}</p>
                          </div>
                          
                          <div className="immersive-card p-6 bg-white/2 border-white/5 h-fit">
                             <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-6 flex items-center gap-2 font-mono">
                               <Users size={12} className="text-emerald-500" /> Distribución Nominal
                             </h4>
                             <div className="space-y-4 font-mono">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-emerald-500 font-bold">AFIRMATIVOS</span>
                                  <span className="text-white font-black">{details.filter(v => v.vote === 'si').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-rose-500 font-bold">NEGATIVOS</span>
                                  <span className="text-white font-black">{details.filter(v => v.vote === 'no').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-amber-500 font-bold">ABSTENCIONES</span>
                                  <span className="text-white font-black">{details.filter(v => v.vote === 'abstencion').length}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase text-slate-600 tracking-widest font-mono">Registro Individual de Votos</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                             {details.map(vote => (
                               <div key={vote.id} className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-colors">
                                 <div className="flex flex-col">
                                   <span className="text-[10px] font-bold text-white uppercase truncate tracking-tight" title={vote.userName}>{vote.userName}</span>
                                   <span className="text-[8px] text-slate-600 uppercase font-mono tracking-tighter">Legajo Digital</span>
                                 </div>
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   vote.vote === 'si' ? "bg-emerald-500 glow-emerald" :
                                   vote.vote === 'no' ? "bg-rose-500 glow-rose" : "bg-amber-500 glow-amber"
                                 )} />
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
