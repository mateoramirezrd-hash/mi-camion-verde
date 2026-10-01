import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, homeFor } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Brand, fieldClass } from '../components/ui';

export default function Register() {
  const { enter } = useAuth();
  const navigate = useNavigate();
  const [zonas, setZonas] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/zonas').then((d) => setZonas(d.zonas)).catch((err) => setError(err.message));
  }, []);

  async function enviar(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      const data = await api('/api/auth/registro', {
        method: 'POST',
        body: {
          nombres: fd.get('nombres'),
          apellidos: fd.get('apellidos'),
          email: fd.get('email'),
          password: fd.get('password'),
          telefono: fd.get('telefono'),
          documento: fd.get('documento'),
          direccion: fd.get('direccion'),
          zonaId: Number(fd.get('zonaId')),
        },
      });
      enter(data);
      navigate(homeFor(data.usuario.rol));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-leaf px-4 py-10">
      <form onSubmit={enviar} className="w-full max-w-lg rounded-[28px] border border-line bg-white p-6">
        <Brand />
        <h1 className="mt-5 text-3xl font-extrabold">Crear cuenta</h1>
        <p className="text-sm text-moss">Para consultar el paso del camión en tu zona.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="nombres" required placeholder="Nombres" className={fieldClass} />
          <input name="apellidos" required placeholder="Apellidos" className={fieldClass} />
          <input name="email" type="email" required placeholder="Correo" className={fieldClass} />
          <input name="password" type="password" minLength={8} required placeholder="Contraseña" className={fieldClass} />
          <input name="documento" required placeholder="Cédula" className={fieldClass} />
          <input name="telefono" placeholder="Teléfono" className={fieldClass} />
          <input name="direccion" required placeholder="Dirección" className={`${fieldClass} md:col-span-2`} />
          <select name="zonaId" required className={`${fieldClass} md:col-span-2`}>
            <option value="">Zona</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}{z.es_piloto ? ' · piloto' : ''}</option>)}
          </select>
        </div>
        {error && <p className="mt-3 text-sm text-warn">{error}</p>}
        <button className="mt-5 h-12 w-full rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Crear cuenta</button>
        <p className="mt-4 text-center text-sm"><Link to="/login" className="font-bold text-pine">Ya tengo cuenta</Link></p>
      </form>
    </main>
  );
}
