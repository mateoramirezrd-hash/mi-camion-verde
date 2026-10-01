import { useEffect, useState } from 'react';
import { CalendarDays, Leaf, Sofa, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { cop, fechaCorta, kg } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle, fieldClass } from '../components/ui';

export default function RequestsPage() {
  const [data, setData] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);

  function cargar() {
    api('/api/cliente/solicitudes').then(setData).catch((err) => setError(err.message));
    api('/api/cliente/resumen').then(setResumen).catch(() => {});
  }

  useEffect(cargar, []);

  async function crear(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await api('/api/cliente/solicitudes', {
        method: 'POST',
        body: {
          fecha: fd.get('fecha'),
          franja: fd.get('franja'),
          observaciones: fd.get('observaciones'),
          detalles: [{ tipoId: Number(fd.get('tipoId')), kg: Number(fd.get('kg')) }],
        },
      });
      setForm(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta solicitud?')) return;
    await api(`/api/cliente/solicitudes/${id}/cancelar`, { method: 'PATCH' });
    cargar();
  }

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data || !resumen) return <Loading />;

  const activas = data.solicitudes.filter((s) => !['cancelada', 'completada'].includes(s.estado));

  return (
    <div>
      <PageTitle title="Solicitudes e impacto" subtitle="Pide una recolección fuera del horario habitual y mira lo que ya recuperaste." />
      <article className="rounded-[22px] bg-forest p-5 text-white">
        <p className="text-xs font-extrabold tracking-wide text-gold">TU IMPACTO · {fechaCorta(resumen.fecha).toUpperCase() || 'ESTE MES'}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-4xl font-extrabold">{kg(resumen.kgMes)} kg</p>
          <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/40 text-gold"><Leaf /></span>
        </div>
        <p className="text-sm text-foam">material recuperado</p>
        <div className="mt-4 flex gap-2">
          <Chip tone="green">{resumen.arboles} árboles</Chip>
          <Chip tone="green">{resumen.co2} kg CO₂e</Chip>
        </div>
      </article>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Solicitudes</h2>
        <button type="button" onClick={() => setForm(form ? null : 'especial')} className="text-sm font-bold text-pine">Nueva</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setForm('voluminosos')} className="rounded-[22px] border border-line bg-white p-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cream text-warn"><Sofa size={18} /></span>
          <p className="mt-3 text-sm font-extrabold">Recoger voluminosos</p>
          <p className="text-xs text-moss">Desde {cop(18000)}</p>
        </button>
        <button type="button" onClick={() => setForm('unidad')} className="rounded-[22px] border border-line bg-white p-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Building2 size={18} /></span>
          <p className="mt-3 text-sm font-extrabold">Jornada para unidad</p>
          <p className="text-xs text-moss">Cotización gratis</p>
        </button>
      </div>

      {form && (
        <form onSubmit={crear} className="mt-4 space-y-3 rounded-[22px] border border-line bg-white p-4">
          <p className="font-extrabold">{form === 'voluminosos' ? 'Recogida de voluminosos' : form === 'unidad' ? 'Jornada para la unidad' : 'Nueva solicitud'}</p>
          <input type="date" name="fecha" required className={fieldClass} />
          <select name="franja" className={fieldClass}>
            <option value="manana">Mañana</option>
            <option value="tarde">Tarde</option>
          </select>
          <select name="tipoId" className={fieldClass} required>
            {data.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <input name="kg" type="number" min="1" step="0.1" placeholder="Kilos estimados" required className={fieldClass} />
          <input name="observaciones" defaultValue={form === 'voluminosos' ? 'Recogida de voluminosos' : form === 'unidad' ? 'Jornada para la unidad' : ''} placeholder="Qué debemos recoger" className={fieldClass} />
          <button type="submit" className="h-11 w-full rounded-2xl bg-forest text-sm font-bold text-white">Dejar solicitud</button>
        </form>
      )}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-4 space-y-3">
        {activas.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-moss">{s.codigo}</span>
              <Chip tone={s.estado === 'programada' ? 'green' : 'blue'}>{s.estado === 'programada' ? 'Confirmada' : s.estado}</Chip>
            </div>
            <p className="mt-2 font-extrabold">{s.observaciones || s.materiales || 'Solicitud de recolección'}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-moss">
              <CalendarDays size={15} /> {fechaCorta(s.fecha_programada)} · {s.franja === 'manana' ? '8:00–10:00 a. m.' : '2:00–4:00 p. m.'}
            </p>
            {['pendiente', 'programada'].includes(s.estado) && (
              <button type="button" onClick={() => cancelar(s.id)} className="mt-3 text-xs font-bold text-warn">Cancelar</button>
            )}
          </Card>
        ))}
      </div>

      {resumen.plan && (
        <Card className="mt-6 p-4">
          <p className="text-xs font-bold text-moss">Plan del hogar</p>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <p className="text-lg font-extrabold">{resumen.plan.nombre}</p>
              <p className="text-sm text-moss">Próximo cobro: {fechaCorta(resumen.plan.vencimiento)}</p>
            </div>
            <p className="text-xl font-extrabold text-pine">{cop(resumen.plan.precio)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-leaf">
            <div className="h-full w-1/2 rounded-full bg-ok" />
          </div>
          <p className="mt-1 text-right text-xs font-bold text-moss">1 de 2 recogidas especiales</p>
        </Card>
      )}
    </div>
  );
}
