import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fieldClass, Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';

export default function StaffRoutes() {
  const [data, setData] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [error, setError] = useState('');

  function cargar() {
    api('/api/operacion/rutas').then(setData).catch((err) => setError(err.message));
    api('/api/operacion/catalogos').then(setCatalogos).catch(() => {});
  }
  useEffect(cargar, []);

  async function crear(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await api('/api/operacion/rutas', { method: 'POST', body: { nombre: fd.get('nombre'), zonaId: Number(fd.get('zonaId')), vehiculoId: Number(fd.get('vehiculoId')) || null } });
    event.currentTarget.reset();
    cargar();
  }

  async function horario(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await api('/api/operacion/horarios', {
      method: 'POST',
      body: { rutaId: Number(fd.get('rutaId')), dia: fd.get('dia'), hora: fd.get('hora'), tipo: fd.get('tipo') },
    });
    event.currentTarget.reset();
    cargar();
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const rutas = [...new Map(data.horarios.map((h) => [h.id, h])).values()];

  return (
    <div className="space-y-4">
      <PageTitle title="Rutas y horarios" subtitle="Cada ruta pertenece a una zona. Los cambios se ven en el calendario del cliente." />
      <Card className="overflow-x-auto p-4">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-moss">
            <tr><th className="py-2">Ruta</th><th>Zona</th><th>Vehículo</th><th>Día</th><th>Hora</th><th>Tipo</th></tr>
          </thead>
          <tbody>
            {data.horarios.map((h) => (
              <tr key={`${h.id}-${h.horario_id}`} className="border-t border-line">
                <td className="py-2 font-bold">{h.nombre}</td>
                <td>{h.zona}</td>
                <td>{h.placa || '—'}</td>
                <td className="capitalize">{h.dia_semana || '—'}</td>
                <td>{h.hora || '—'}</td>
                <td>{h.tipo_recoleccion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={crear} className="space-y-2 rounded-[22px] border border-line bg-white p-4">
          <h2 className="font-extrabold">Nueva ruta</h2>
          <input name="nombre" required placeholder="Nombre de la ruta" className={fieldClass} />
          <select name="zonaId" required className={fieldClass}>
            <option value="">Zona</option>
            {catalogos?.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
          <select name="vehiculoId" className={fieldClass}>
            <option value="">Vehículo</option>
            {catalogos?.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
          </select>
          <button className="h-11 w-full rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Crear ruta</button>
        </form>
        <form onSubmit={horario} className="space-y-2 rounded-[22px] border border-line bg-white p-4">
          <h2 className="font-extrabold">Nuevo horario</h2>
          <select name="rutaId" required className={fieldClass}>
            {rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <select name="dia" className={fieldClass}>
            {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((d) => <option key={d}>{d}</option>)}
          </select>
          <input name="hora" type="time" required className={fieldClass} />
          <select name="tipo" className={fieldClass}>
            <option value="ordinaria">Ordinaria</option>
            <option value="reciclable">Reciclable</option>
            <option value="organica">Orgánica</option>
          </select>
          <button className="h-11 w-full rounded-2xl bg-pine text-sm font-bold text-white" type="submit">Agregar horario</button>
        </form>
      </div>
    </div>
  );
}

export function StaffComplaints() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  function cargar() {
    api('/api/operacion/quejas').then(setData).catch((err) => setError(err.message));
  }
  useEffect(cargar, []);

  async function atender(id, estado, respuesta) {
    await api(`/api/operacion/quejas/${id}`, { method: 'PATCH', body: { estado, respuesta } });
    cargar();
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const lista = data.quejas.filter((item) => `${item.descripcion} ${item.zona} ${item.nombres}`.toLowerCase().includes(q));

  return (
    <div className="space-y-3">
      <PageTitle title="Quejas y reportes" subtitle="Cambia el estado y responde. El vecino recibe el aviso." />
      {lista.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold">MCV-{item.id} · {item.descripcion}</p>
            <Chip>{item.estado.replaceAll('_', ' ')}</Chip>
          </div>
          <p className="text-sm text-moss">{item.nombres} {item.apellidos} · {item.zona} · {item.referencia_ubicacion}</p>
          {item.foto && <img src={item.foto} alt="Evidencia del reporte" className="mt-3 h-36 w-full rounded-2xl object-cover" />}
          <form
            className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              atender(item.id, fd.get('estado'), fd.get('respuesta'));
            }}
          >
            <select name="estado" defaultValue={item.estado} className={fieldClass}>
              {['recibido', 'en_revision', 'en_atencion', 'resuelto', 'rechazado'].map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input name="respuesta" defaultValue={item.respuesta || ''} placeholder="Respuesta para el vecino" className={fieldClass} />
            <button className="rounded-2xl bg-forest px-4 text-sm font-bold text-white" type="submit">Guardar</button>
          </form>
        </Card>
      ))}
    </div>
  );
}
