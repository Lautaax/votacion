import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Expediente } from '../types';
import { Search, Download, History, Activity } from 'lucide-react';
import HistoryList from '../components/HistoryList';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function HistoryView() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'aprobado' | 'rechazado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let q = query(collection(db, 'expedientes'), orderBy('createdAt', 'desc'));
    
    if (filterStatus !== 'todos') {
      q = query(collection(db, 'expedientes'), where('status', '==', filterStatus), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setExpedientes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expediente)));
      setLoading(false);
    });
    return unsub;
  }, [filterStatus]);

  const exportAllToPDF = async () => {
    alert("Exportación deshabilitada momentáneamente por mantenimiento de librerías.");
  };

  const filteredExpedientes = expedientes.filter(exp => 
    exp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Archivo Legislativo</h1>
          <div className="flex items-center gap-3">
             <History size={14} className="text-emerald-500" />
             <p className="text-slate-500 text-[10px] uppercase font-mono tracking-widest leading-none">Registro oficial de ordenanzas y votaciones pasadas</p>
          </div>
        </div>
        
        <button 
          onClick={exportAllToPDF} 
          className="btn-immersive-secondary flex items-center gap-2 group"
        >
          <Download size={18} className="transition-transform group-hover:-translate-y-0.5" /> 
          <span className="text-[10px] font-black uppercase tracking-widest">Generar Reporte Consolidado</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="BUSCAR ORDENANZA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/2 border border-white/5 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-emerald-500/30 text-xs font-mono uppercase tracking-widest transition-all"
          />
        </div>
        
        <div className="md:col-span-2 flex gap-2 p-1.5 bg-white/2 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          {(['todos', 'aprobado', 'rechazado'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "flex-grow min-w-[100px] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                filterStatus === status ? "bg-emerald-500 text-white glow-emerald shadow-lg" : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Activity className="text-emerald-500/20 animate-pulse" size={48} />
          <p className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-widest animate-pulse">Sincronizando archivo central...</p>
        </div>
      ) : (
        <HistoryList expedientes={filteredExpedientes} />
      )}
    </div>
  );
}
