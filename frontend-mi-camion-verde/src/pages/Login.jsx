import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, homeFor } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Brand, fieldClass } from '../components/ui';

const CUENTAS = [
  ['cliente@micamionverde.co', 'Vecino de El Porvenir'],
  ['admin@micamionverde.co', 'Operación'],
  ['gerente@micamionverde.co', 'Gerencia'],
  ['comercial@micamionverde.co', 'Comercial'],
];

export default function Login() {
  const { enter, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('cliente@micamionverde.co');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (user) navigate(homeFor(user.rol), { replace: true });
  }, [user, navigate]);

  async function enviar(event) {
    event.preventDefault();
    setCargando(true);
    setError('');
    const fd = new FormData(event.currentTarget);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { email: fd.get('email'), password: fd.get('password') },
      });
      enter(data);
      navigate(homeFor(data.usuario.rol));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-leaf px-4 py-10">
      <form onSubmit={enviar} className="w-full max-w-md rounded-[28px] border border-line bg-white p-6 shadow-[0_6px_9px_rgba(23,63,34,0.06)]">
        <Brand />
        <h1 className="mt-6 text-3xl font-extrabold">Entra a tu barrio</h1>
        <p className="mt-1 text-sm text-moss">Tu basura en su lugar, el futuro en tus manos.</p>
        <label className="mt-6 block text-sm font-bold">Correo
          <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldClass} mt-1`} />
        </label>
        <label className="mt-3 block text-sm font-bold">Contraseña
          <input name="password" type="password" required minLength={8} defaultValue="Verde2026!" className={`${fieldClass} mt-1`} />
        </label>
        {error && <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-sm text-warn">{error}</p>}
        <button disabled={cargando} className="mt-5 h-12 w-full rounded-2xl bg-forest text-sm font-bold text-white disabled:opacity-60" type="submit">
          {cargando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {CUENTAS.map(([correo, label]) => (
            <button key={correo} type="button" onClick={() => setEmail(correo)} className="rounded-2xl bg-leaf px-2 py-2 text-left text-xs font-bold text-pine">
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-moss">
          ¿Aún no tienes cuenta? <Link to="/registro" className="font-bold text-pine">Regístrate</Link>
        </p>
      </form>
    </main>
  );
}
