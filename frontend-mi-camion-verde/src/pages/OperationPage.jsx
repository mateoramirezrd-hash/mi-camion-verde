import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fieldClass, Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';
import { kg } from '../lib/format';

export default function OperationPage() {
  const [data, setData] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api('/api/operacion/panel').then(setData).catch((err) => setError(err.message));
    api('/api/operacion/catalogos').then(setCatalogos).catch(() => {});
  }, []);

  async function publicar(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      const res = await api('/api/operacion/incidencias', {
        method: 'POST',
        body: {
          zonaId: Number(fd.get('zonaId')),
          tipo: fd.get('tipo'),
          descripcion: fd.get('descripcion'),
          retrasoMinutos: Number(fd.get('retraso') || 0),
          nuevaHora: fd.get('hora') || null,
        },
      });
      setOk(`Aviso publicado. Avisamos a ${res.avisados} vecinos.`);
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  return (
    <div>
      <PageTitle title="Control de operación" subtitle={`Jueves de ruta · actualización ${data.hora}`} />
      <div className="mb-4 flex items-center justify-between md:hidden">
        <h1 className="text-2xl font-extrabold">Control de operación</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k="Rutas en curso" v={`${data.rutasEnCurso} / ${data.rutasTotal}`} />
        <Mini k="Quejas abiertas" v={data.quejasAbiertas} />
        <Mini k="Alertas de tráfico" v={data.alertasTrafico} />
        <Mini k="Material de hoy" v={`${kg(data.materialKg)} kg`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="relative h-56">
            <img src="/brand/ruta-mapa.png" alt="Mapa operativo de Rionegro" className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3"><Chip tone="amber">{data.alertasTrafico} alertas de tráfico</Chip></div>
          </div>
          <div className="flex gap-3 p-3 text-xs font-bold text-moss">
            <span>A tiempo</span><span>Demora</span><span>Detenido</span>
          </div>
        </Card>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Rutas activas</h2>
            <Link to="/operacion/rutas" className="text-sm font-bold text-pine">Ver rutas</Link>
          </div>
          <div className="space-y-3">
            {data.rutas.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold">{r.nombre}</p>
                  <Chip tone={r.estado === 'demora' ? 'amber' : r.estado === 'completada' ? 'blue' : 'green'}>
                    {r.estado === 'demora' ? 'Con demora' : r.estado === 'completada' ? 'Completada' : 'En ruta'}
                  </Chip>
                </div>
                <p className="text-xs text-moss">Vehículo {r.placa || 'sin asignar'}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-leaf">
                  <div className={`h-full rounded-full ${r.estado === 'demora' ? 'bg-gold' : 'bg-ok'}`} style={{ width: `${r.progreso}%` }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-extrabold">Quejas priorizadas</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {data.quejas.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 py-2">
                <span><b>{q.codigo}</b> {q.descripcion}</span>
                <span className="text-moss">{q.zona}</span>
              </li>
            ))}
          </ul>
          <Link to="/operacion/quejas" className="mt-2 inline-block text-sm font-bold text-pine">Atender</Link>
        </Card>
        <Card className="p-4">
          <h2 className="font-extrabold">Publicar una incidencia</h2>
          <form onSubmit={publicar} className="mt-3 space-y-2">
            <select name="zonaId" className={fieldClass} required>
              <option value="">Zona</option>
              {catalogos?.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
            <select name="tipo" className={fieldClass}>
              <option value="trafico">Tráfico</option>
              <option value="averia">Avería</option>
              <option value="clima">Clima</option>
              <option value="otro">Otro</option>
            </select>
            <textarea name="descripcion" required minLength={8} placeholder="Qué está pasando y en qué punto" className={fieldClass} />
            <div className="grid grid-cols-2 gap-2">
              <input name="retraso" type="number" min="0" placeholder="Minutos de retraso" className={fieldClass} />
              <input name="hora" type="time" className={fieldClass} />
            </div>
            <button className="h-11 w-full rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Avisar a la zona</button>
            {ok && <p className="text-sm font-semibold text-ok">{ok}</p>}
            {error && <p className="text-sm text-warn">{error}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}

function Mini({ k, v }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-moss">{k}</p>
      <p className="mt-2 text-2xl font-extrabold">{v}</p>
    </Card>
  );
}
