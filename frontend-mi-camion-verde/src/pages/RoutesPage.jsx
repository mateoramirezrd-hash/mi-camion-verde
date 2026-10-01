import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { mesLargo } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';

const HEADS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function RoutesPage() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ reciclable: true, ordinario: true });

  useEffect(() => {
    setError('');
    api(`/api/cliente/calendario?mes=${mes}`).then(setData).catch((err) => setError(err.message));
  }, [mes]);

  const semana = useMemo(() => {
    if (!data) return [];
    const hoy = data.dias.find((d) => d.esHoy) || data.dias[0];
    const start = new Date(`${hoy.fecha}T12:00:00`);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      return data.dias.find((d) => d.fecha === iso) || { fecha: iso, dia: date.getDate(), esHoy: false, reciclable: false, ordinario: false };
    });
  }, [data]);

  function mover(delta) {
    const [year, month] = mes.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setMes(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  const lista = data.proximas.filter((item) => {
    if (item.tipo === 'especial') return true;
    if (item.tipo === 'reciclable') return filtros.reciclable;
    if (item.tipo === 'ordinaria') return filtros.ordinario;
    return true;
  });

  return (
    <div>
      <PageTitle title="Calendario y rutas" subtitle="Días y horas en que pasa el camión por tu zona." />
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{mesLargo(data.mes)}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => mover(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-mint font-bold text-pine" aria-label="Mes anterior">‹</button>
            <button type="button" onClick={() => mover(1)} className="grid h-9 w-9 place-items-center rounded-full bg-mint font-bold text-pine" aria-label="Mes siguiente">›</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-moss">
          {HEADS.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 md:hidden">
          {semana.map((d) => (
            <div key={d.fecha} className={`rounded-2xl py-2 text-center text-sm font-bold ${d.esHoy ? 'bg-forest text-white' : 'text-ink'}`}>
              {d.dia}
            </div>
          ))}
        </div>
        <div className="mt-2 hidden grid-cols-7 gap-1 md:grid">
          {Array.from({ length: (new Date(`${data.dias[0].fecha}T12:00:00`).getDay() + 6) % 7 }).map((_, i) => <span key={i} />)}
          {data.dias.map((d) => (
            <div key={d.fecha} className={`rounded-2xl py-3 text-center text-sm font-bold ${d.esHoy ? 'bg-forest text-white' : ''}`}>
              {d.dia}
              <span className="mt-1 flex justify-center gap-1">
                {d.reciclable && <i className="h-1.5 w-1.5 rounded-full bg-ok" />}
                {d.ordinario && <i className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Filter on={filtros.reciclable} onClick={() => setFiltros((f) => ({ ...f, reciclable: !f.reciclable }))}>Reciclables</Filter>
          <Filter on={filtros.ordinario} tone="blue" onClick={() => setFiltros((f) => ({ ...f, ordinario: !f.ordinario }))}>Ordinarios</Filter>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Próximas recolecciones</h2>
        <span className="text-sm font-bold text-pine">Mapa</span>
      </div>
      <div className="mt-3 space-y-3">
        {lista.map((item) => (
          <Card key={`${item.fecha}-${item.titulo}`} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-moss">{item.hora}</span>
              <Chip tone={item.estado === 'en_curso' ? 'green' : item.estado === 'especial' ? 'amber' : 'blue'}>
                {item.estado === 'en_curso' ? 'En curso' : item.estado === 'especial' ? 'Especial' : 'Programada'}
              </Chip>
            </div>
            <p className="mt-2 text-lg font-extrabold">{item.titulo}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-moss"><MapPin size={16} /> {item.trayecto}</p>
          </Card>
        ))}
        {!lista.length && <p className="text-sm text-moss">No hay pasos con ese filtro.</p>}
      </div>
    </div>
  );
}

function Filter({ on, tone = 'green', children, onClick }) {
  const active = tone === 'blue' ? 'bg-sky-100 text-sky-800' : 'bg-mint text-ok';
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-bold ${on ? active : 'bg-white text-moss border border-line'}`}>
      {children}
    </button>
  );
}
