import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, ErrorNote, fieldClass } from '../components/ui';

export default function MorePage() {
  const { logout, actualizarNombre } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api('/api/cliente/perfil').then((d) => setPerfil(d.perfil)).catch((err) => setError(err.message));
    api('/api/cliente/preferencias').then((d) => setPrefs(d.preferencias)).catch(() => {});
    api('/api/cliente/notificaciones').then((d) => setAvisos(d.notificaciones)).catch(() => {});
  }, []);

  async function guardarPerfil(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const data = await api('/api/cliente/perfil', {
      method: 'PUT',
      body: { nombres: fd.get('nombres'), apellidos: fd.get('apellidos'), telefono: fd.get('telefono') },
    });
    actualizarNombre(data.nombre);
    setOk('Guardamos tus datos');
  }

  async function guardarAlertas(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await api('/api/cliente/preferencias', {
      method: 'PUT',
      body: {
        recordatorioActivo: fd.get('recordatorio') === 'on',
        alertasRetraso: fd.get('retraso') === 'on',
        canalPush: fd.get('push') === 'on',
        minutosAntes: Number(fd.get('minutos')),
      },
    });
    if (fd.get('push') === 'on' && 'Notification' in window) {
      const permiso = await Notification.requestPermission();
      if (permiso === 'granted') {
        const token = localStorage.getItem('mcv-device') || crypto.randomUUID();
        localStorage.setItem('mcv-device', token);
        await api('/api/cliente/dispositivo', { method: 'POST', body: { token } });
      }
    }
    setOk('Alertas actualizadas');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      {ok && <p className="rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-ok">{ok}</p>}
      <div className="grid grid-cols-2 gap-3 text-sm font-bold">
        <Link to="/solicitudes" className="rounded-2xl bg-white p-4 border border-line">Solicitudes</Link>
        <Link to="/facturacion" className="rounded-2xl bg-white p-4 border border-line">Facturas</Link>
      </div>
      {perfil && (
        <Card className="p-4">
          <h2 className="text-lg font-extrabold">Tus datos</h2>
          <p className="text-sm text-moss">{perfil.direccion} · {perfil.zona}</p>
          <form onSubmit={guardarPerfil} className="mt-3 space-y-3">
            <input name="nombres" defaultValue={perfil.nombres} className={fieldClass} required />
            <input name="apellidos" defaultValue={perfil.apellidos} className={fieldClass} required />
            <input name="telefono" defaultValue={perfil.telefono || ''} className={fieldClass} placeholder="Teléfono" />
            <button className="h-11 w-full rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Guardar</button>
          </form>
        </Card>
      )}
      {prefs && (
        <Card className="p-4">
          <h2 className="text-lg font-extrabold">Alertas</h2>
          <form onSubmit={guardarAlertas} className="mt-3 space-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="recordatorio" defaultChecked={!!prefs.recordatorio_activo} /> Recordatorio antes del camión</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="retraso" defaultChecked={!!prefs.alertas_retraso} /> Avisos de retraso</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="push" defaultChecked={!!prefs.canal_push} /> Notificaciones en este dispositivo</label>
            <label className="block">Minutos de anticipación
              <input name="minutos" type="number" min="10" max="240" defaultValue={prefs.minutos_antes} className={`${fieldClass} mt-1`} />
            </label>
            <button className="h-11 w-full rounded-2xl bg-pine text-sm font-bold text-white" type="submit">Guardar alertas</button>
          </form>
        </Card>
      )}
      <Card className="p-4">
        <h2 className="text-lg font-extrabold">Notificaciones</h2>
        <ul className="mt-3 space-y-3">
          {avisos.map((n) => (
            <li key={n.id} className="border-b border-line pb-2 text-sm last:border-0">
              <p className="font-bold">{n.titulo}</p>
              <p className="text-moss">{n.mensaje}</p>
            </li>
          ))}
          {!avisos.length && <li className="text-sm text-moss">Todavía no hay avisos.</li>}
        </ul>
      </Card>
      <button
        type="button"
        onClick={() => { logout(); navigate('/login'); }}
        className="h-11 w-full rounded-2xl border border-line bg-white text-sm font-bold"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
