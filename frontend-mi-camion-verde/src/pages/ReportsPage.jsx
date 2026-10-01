import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { hace } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';

const TONOS = {
  en_revision: 'amber',
  en_atencion: 'blue',
  recibido: 'blue',
  resuelto: 'green',
  rechazado: 'white',
};

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('activas');

  useEffect(() => {
    api('/api/cliente/quejas').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  const lista = data.quejas.filter((q) => {
    if (filtro === 'activas') return !['resuelto', 'rechazado'].includes(q.estado);
    if (filtro === 'resueltas') return ['resuelto', 'rechazado'].includes(q.estado);
    return true;
  });

  return (
    <div>
      <PageTitle title="Tus reportes" subtitle="Seguimiento transparente, paso a paso." />
      <div className="md:hidden">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Tus reportes</h2>
            <p className="text-sm text-moss">Seguimiento transparente, paso a paso.</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gold text-lg font-extrabold text-ink">{data.conteo.activas}</span>
        </div>
      </div>
      <Link to="/reportes/nuevo" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-forest text-sm font-bold text-white">
        <Plus size={18} /> Crear nuevo reporte
      </Link>
      <div className="mt-4 flex gap-2">
        {[
          ['activas', `Activas ${data.conteo.activas}`],
          ['resueltas', `Resueltas ${data.conteo.resueltas}`],
          ['todas', 'Todas'],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFiltro(id)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filtro === id ? 'bg-mint text-ok' : 'bg-white text-moss'}`}>
            {label}
          </button>
        ))}
      </div>
      <h2 className="mt-5 text-xl font-extrabold capitalize">{filtro}</h2>
      <div className="mt-3 space-y-3">
        {lista.map((q) => (
          <Card key={q.id} className="p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-moss">#{q.codigo} · {hace(q.created_at)}</span>
              <Chip tone={TONOS[q.estado]}>{q.etiqueta}</Chip>
            </div>
            <p className="mt-2 text-lg font-extrabold">{q.descripcion}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-moss"><MapPin size={15} /> {q.referencia_ubicacion}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-leaf">
              <div className="h-full rounded-full bg-ok" style={{ width: `${q.progreso}%` }} />
            </div>
            {q.respuesta && <p className="mt-2 text-sm text-pine">{q.respuesta}</p>}
          </Card>
        ))}
        {!lista.length && <p className="text-sm text-moss">No hay reportes en este filtro.</p>}
      </div>
    </div>
  );
}
