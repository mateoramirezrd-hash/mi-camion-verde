import { createContext, useContext, useEffect, useState } from 'react';
import { sincronizarQuejas } from '../lib/offline';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mcv-token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mcv-user') || 'null');
    } catch {
      return null;
    }
  });
  const [avisoSync, setAvisoSync] = useState('');

  function enter(data) {
    localStorage.setItem('mcv-token', data.token);
    localStorage.setItem('mcv-user', JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
  }

  function logout() {
    localStorage.removeItem('mcv-token');
    localStorage.removeItem('mcv-user');
    setToken('');
    setUser(null);
  }

  function actualizarNombre(nombre) {
    const next = { ...user, nombre };
    localStorage.setItem('mcv-user', JSON.stringify(next));
    setUser(next);
  }

  useEffect(() => {
    if (!token || user?.rol !== 'cliente') return undefined;
    let activo = true;
    async function flush() {
      if (!navigator.onLine) return;
      const n = await sincronizarQuejas(token).catch(() => 0);
      if (activo && n > 0) setAvisoSync(n === 1 ? 'Enviamos 1 reporte pendiente' : `Enviamos ${n} reportes pendientes`);
    }
    flush();
    window.addEventListener('online', flush);
    return () => {
      activo = false;
      window.removeEventListener('online', flush);
    };
  }, [token, user?.rol]);

  return (
    <AuthContext.Provider value={{ token, user, enter, logout, actualizarNombre, avisoSync, setAvisoSync }}>
      {children}
    </AuthContext.Provider>
  );
}

// El hook vive junto al proveedor para que la sesión tenga un solo origen.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
