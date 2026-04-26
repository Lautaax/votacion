import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Shield, User, Loader2, Mail, Lock, Check } from 'lucide-react';

export default function Auth({ onComplete }: { onComplete: (user: UserProfile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'concejal'>('concejal');
  const [party, setParty] = useState('');
  const [isBloquePresident, setIsBloquePresident] = useState(false);
  
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        if (!name) { setError('El nombre es requerido'); return; }
        try {
          const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
          const userProfile: UserProfile = {
            uid: fbUser.uid,
            name,
            role,
            party: role === 'concejal' ? party : 'Presidencia',
            isCheckedIn: true,
            isBloquePresident: role === 'concejal' ? isBloquePresident : false
          };
          await setDoc(doc(db, 'users', fbUser.uid), userProfile);
          onComplete(userProfile);
        } catch (regError: any) {
          if (regError.code === 'auth/email-already-in-use') {
            setError('Este correo ya está registrado. Intente iniciar sesión.');
            setIsRegister(false); // Switch to login
          } else {
            throw regError;
          }
        }
      } else {
        const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          onComplete(userDoc.data() as UserProfile);
        } else {
          // If profile is missing but user is authorized email, create it
          if (fbUser.email === 'lautaroj.aguilera@gmail.com') {
             const adminProfile: UserProfile = {
               uid: fbUser.uid,
               name: fbUser.displayName || 'Administrador',
               role: 'admin',
               party: 'CONCEJO DELIBERANTE',
               isCheckedIn: false
             };
             await setDoc(doc(db, 'users', fbUser.uid), adminProfile);
             onComplete(adminProfile);
          } else {
            setError('Perfil de usuario no encontrado en la base de datos.');
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      setError(error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl p-4">
      <div className="immersive-card max-w-md w-full p-8 border-emerald-500/20">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-4 glow-emerald">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isRegister ? 'Registro de Personal' : 'Acceso Autorizado'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-mono">
            {isRegister ? 'Crear credenciales legislativas' : 'Ingrese sus credenciales de acceso'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 tracking-widest">Nombre Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 tracking-widest">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                placeholder="usuario@concejo.gob"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 tracking-widest">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-emerald-500/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 tracking-widest">Rol en el Concejo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRole('concejal')}
                    className={`py-2 px-4 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all ${role === 'concejal' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >
                    <User size={14} /> Concejal
                  </button>
                  <button
                    onClick={() => setRole('admin')}
                    className={`py-2 px-4 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all ${role === 'admin' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >
                    <Shield size={14} /> Admin
                  </button>
                </div>
              </div>

              {role === 'concejal' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 tracking-widest">Partido/Bloque</label>
                    <input
                      type="text"
                      value={party}
                      onChange={(e) => setParty(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                      placeholder="Ej. Bloque Justicialista"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isBloquePresident ? 'bg-emerald-600 border-emerald-500' : 'bg-white/5 border-white/10'}`}>
                      {isBloquePresident && <Check size={12} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isBloquePresident} 
                      onChange={e => setIsBloquePresident(e.target.checked)} 
                    />
                    <span className="text-xs font-bold uppercase text-slate-500 group-hover:text-slate-400 tracking-wider">Presidente de Bloque</span>
                  </label>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleAuth}
            disabled={loading || !email || !password || (isRegister && !name)}
            className="btn-immersive-primary w-full py-3.5 mt-4 flex items-center justify-center gap-2 glow-emerald"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isRegister ? 'Registrar Usuario' : 'Acceder')}
          </button>

          <button 
            disabled={loading}
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-[10px] uppercase font-bold text-slate-500 hover:text-emerald-500 transition-colors mt-2"
          >
            {isRegister ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese'}
          </button>
        </div>
      </div>
    </div>
  );
}
