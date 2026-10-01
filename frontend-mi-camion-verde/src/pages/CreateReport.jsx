import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Camera, MapPin, WifiOff } from 'lucide-react';
import { api } from '../lib/api';
import { guardarQuejaOffline } from '../lib/offline';
import { ErrorNote, PageTitle } from '../components/ui';

const TIPOS = [
  ['falla_servicio', 'Recolección omitida'],
  ['acumulacion_residuos', 'Acumulación de residuos'],
  ['contenedor_danado', 'Contenedor dañado'],
  ['sugerencia', 'Sugerencia'],
  ['inquietud', 'Inquietud'],
];

export default function CreateReport() {
  const navigate = useNavigate();
  const { online } = useOutletContext();
  const [tipo, setTipo] = useState('falla_servicio');
  const [descripcion, setDescripcion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [coords, setCoords] = useState(null);
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gps, setGps] = useState('');

  function ubicar() {
    if (!navigator.geolocation) {
      setGps('Este dispositivo no comparte la ubicación');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const metros = Math.max(5, Math.round(pos.coords.accuracy));
        setGps(`GPS preciso · ${metros} m`);
        if (!referencia) setReferencia('Ubicación actual');
      },
      () => setGps('No autorizaste la ubicación. Puedes escribir la dirección.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function enviar(event) {
    event.preventDefault();
    setError('');
    if (descripcion.trim().length < 8) {
      setError('Cuéntanos qué ocurrió, al menos una frase.');
      return;
    }
    setEnviando(true);
    try {
      if (!online) {
        await guardarQuejaOffline({
          tipo,
          descripcion,
          referencia,
          latitud: coords?.lat,
          longitud: coords?.lng,
          foto,
          fotoName: foto?.name,
        });
        navigate('/reportes');
        return;
      }
      const form = new FormData();
      form.set('tipo', tipo);
      form.set('descripcion', descripcion);
      if (referencia) form.set('referencia', referencia);
      if (coords) {
        form.set('latitud', String(coords.lat));
        form.set('longitud', String(coords.lng));
      }
      if (foto) form.set('fotos', foto);
      await api('/api/cliente/quejas', { method: 'POST', form });
      navigate('/reportes');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const pasos = [Boolean(tipo), Boolean(foto), Boolean(referencia || coords)];

  return (
    <form onSubmit={enviar} className="mx-auto max-w-xl">
      <PageTitle title="Crear reporte" subtitle="Foto, lugar y una descripción corta alcanzan para atenderte." />
      {!online && (
        <div className="mb-4 flex gap-3 rounded-2xl bg-cream p-4 text-sm text-warn">
          <WifiOff size={18} className="mt-0.5 shrink-0" />
          <p>Puedes continuar. Guardaremos el reporte y lo enviaremos al recuperar conexión.</p>
        </div>
      )}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-moss">
        {['Tipo', 'Evidencia', 'Ubicación'].map((label, i) => (
          <div key={label}>
            <div className={`mb-1 h-1.5 rounded-full ${pasos[i] ? 'bg-forest' : 'bg-foam'}`} />
            {label}
          </div>
        ))}
      </div>
      {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}
      <label className="text-sm font-bold">¿Qué ocurrió?</label>
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm">
        {TIPOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>

      <p className="mt-5 text-sm font-bold">Foto del problema</p>
      <label className="mt-2 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-ok/40 bg-mint/60 px-4 py-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-pine"><Camera size={22} /></span>
        <span className="mt-3 font-extrabold text-pine">{foto ? foto.name : 'Tomar o elegir foto'}</span>
        <span className="text-xs text-moss">JPG o PNG · máximo 8 MB</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
      </label>

      <div className="mt-4 rounded-[22px] border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="font-bold">Ubicación</p>
          <button type="button" onClick={ubicar} className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ok">{gps || 'Usar GPS'}</button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-moss">
          <MapPin size={16} className="text-pine" />
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Calle 37 # 52-18, El Porvenir" className="w-full bg-transparent outline-none" />
        </label>
      </div>

      <label className="mt-5 block text-sm font-bold">Detalle opcional</label>
      <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Ej. la bolsa lleva desde esta mañana..." className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm" />

      <button type="submit" disabled={enviando} className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-gold text-sm font-extrabold text-ink disabled:opacity-60">
        {enviando ? 'Guardando…' : online ? 'Enviar reporte' : 'Guardar para sincronizar'}
      </button>
    </form>
  );
}
