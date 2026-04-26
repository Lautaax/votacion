import React, { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile, SessionConfig } from './types';
import Header from './components/Header';
import LiveVoting from './views/LiveVoting';
import HistoryView from './views/HistoryView';
import PanelConcejal from './views/PanelConcejal';
import PanelAdmin from './views/PanelAdmin';
import Auth from './components/Auth';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'live' | 'history' | 'admin' | 'councilor'>('live');
  const [config, setConfig] = useState<SessionConfig | null>(null);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'session'), (document) => {
      if (document.exists()) {
        setConfig(document.data() as SessionConfig);
      }
    }, (error) => {
      console.warn("Config listener error (expected if not initialized):", error.message);
    });

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else if (fbUser.email === 'lautaroj.aguilera@gmail.com') {
            console.log("Auto-creating missing admin profile...");
            const adminProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Admin Inicial',
              email: fbUser.email || 'lautaroj.aguilera@gmail.com',
              role: 'admin',
              party: 'CONCEJO DELIBERANTE',
              isCheckedIn: false
            };
            await setDoc(doc(db, 'users', fbUser.uid), adminProfile);
            setUser(adminProfile);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error("Auth status change error:", e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubAuth();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderView = () => {
    // Authorized email for recovery/init
    const isAuthorizedEmail = auth.currentUser?.email === 'lautaroj.aguilera@gmail.com';
    const canInitialize = user?.role === 'admin' || isAuthorizedEmail;

    if (!config) {
      if (canInitialize) {
         return (
           <div className="flex flex-col items-center justify-center p-20 space-y-6">
             <div className="text-center">
               <ShieldAlert className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
               <h2 className="text-2xl font-bold">Sistema no Inicializado</h2>
               <p className="text-slate-500">Es necesario configurar la sesión inicial para comenzar.</p>
               {isAuthorizedEmail && !user && <p className="text-amber-500 text-xs mt-2 font-mono">AUTORIZADO POR CORREO: CREARÁ PERFIL ADMIN</p>}
             </div>
             <button 
               onClick={async () => {
                 try {
                   // Ensure profile exists for authorized email
                   if (isAuthorizedEmail && !user && auth.currentUser) {
                     await setDoc(doc(db, 'users', auth.currentUser.uid), {
                       uid: auth.currentUser.uid,
                       name: auth.currentUser.displayName || 'Admin Inicial',
                       email: auth.currentUser.email,
                       role: 'admin',
                       party: 'CONCEJO DELIBERANTE',
                       isCheckedIn: false
                     });
                   }

                   await setDoc(doc(db, 'config', 'session'), {
                     isSessionActive: false,
                     quorumRequired: 10,
                     activeExpedienteId: null,
                     timerEnd: null,
                     nextSessionDate: new Date().toISOString().split('T')[0],
                     lastInitialized: new Date().toISOString()
                   });
                   
                   // Small local state refresh or just let onSnapshot handle it
                   window.location.reload(); 
                 } catch (e) {
                   console.error("Error initializing:", e);
                   alert("Error al inicializar: " + (e instanceof Error ? e.message : String(e)));
                 }
               }}
               className="btn-immersive-primary px-8 py-3 uppercase font-black text-xs glow-emerald"
             >
               Inicializar Sistema Legislativo
             </button>
           </div>
         );
      }
      return (
        <div className="flex flex-col items-center justify-center p-20">
          {!auth.currentUser ? (
             <div className="text-center space-y-4">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Para configurar el sistema por primera vez, debe iniciar sesión con una cuenta autorizada.</p>
                <button 
                  onClick={() => setView('admin')}
                  className="px-6 py-2 border border-white/10 rounded-xl text-[10px] font-mono hover:bg-white/5"
                >
                  Ir a Login
                </button>
             </div>
          ) : (
            <>
              <Loader2 className="animate-spin text-emerald-500 mb-4" />
              <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Esperando configuración del sistema...</p>
            </>
          )}
        </div>
      );
    }

    switch (view) {
      case 'live':
        return <LiveVoting config={config} />;
      case 'history':
        return <HistoryView />;
      case 'admin':
        return user?.role === 'admin' ? <PanelAdmin config={config} user={user} /> : <div className="p-20 text-center">Acceso Denegado</div>;
      case 'councilor':
        return user?.role === 'concejal' ? <PanelConcejal config={config} user={user} /> : <div className="p-20 text-center">Acceso Denegado</div>;
      default:
        return <LiveVoting config={config} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30">
      <Header currentView={view} setView={setView} user={user} />
      
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
      
      {!user && (view === 'councilor' || view === 'admin') && (
        <Auth onComplete={(u) => setUser(u)} />
      )}
    </div>
  );
}
