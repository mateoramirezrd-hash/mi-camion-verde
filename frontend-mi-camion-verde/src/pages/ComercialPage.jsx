import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { cop } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle, fieldClass } from '../components/ui';

export default function ComercialPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  function cargar() {
    api('/api/comercial/panel').then(setData).catch((err) => setError(err.message));
  }
  useEffect(cargar, []);

  async function plan(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await api('/api/comercial/planes', {
      method: 'POST',
      body: { nombre: fd.get('nombre'), frecuencia: fd.get('frecuencia'), precio: Number(fd.get('precio')), descripcion: fd.get('descripcion') },
    });
    event.currentTarget.reset();
    cargar();
  }

  async function pago(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await api('/api/comercial/pagos', {
      method: 'POST',
      body: { facturaId: Number(fd.get('facturaId')), monto: Number(fd.get('monto')), metodo: fd.get('metodo'), referencia: fd.get('referencia') },
    });
    event.currentTarget.reset();
    cargar();
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  return (
    <div className="space-y-4">
      <PageTitle title="Planes y cartera" subtitle="Suscripciones, facturas y pagos del servicio." />
      <div className="grid gap-3 md:grid-cols-2">
        {data.planes.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-extrabold">{p.nombre}</p>
                <p className="text-sm capitalize text-moss">{p.frecuencia}</p>
              </div>
              <p className="text-xl font-extrabold text-pine">{cop(p.precio)}</p>
            </div>
            <Chip tone={p.activo ? 'green' : 'white'}>{p.activo ? 'Activo' : 'Inactivo'}</Chip>
          </Card>
        ))}
      </div>
      <form onSubmit={plan} className="grid gap-2 rounded-[22px] border border-line bg-white p-4 md:grid-cols-4">
        <input name="nombre" required placeholder="Nombre del plan" className={fieldClass} />
        <select name="frecuencia" className={fieldClass}>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
          <option value="demanda">Por demanda</option>
        </select>
        <input name="precio" type="number" min="0" required placeholder="Precio" className={fieldClass} />
        <button className="rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Crear plan</button>
      </form>
      <h2 className="text-lg font-extrabold">Facturas</h2>
      {data.facturas.map((f) => (
        <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div><p className="font-extrabold">{f.numero}</p><p className="text-moss">{f.cliente}</p></div>
          <div className="text-right"><p className="font-extrabold">{cop(f.total)}</p><Chip tone={f.estado === 'pagada' ? 'green' : 'amber'}>{f.estado}</Chip></div>
        </Card>
      ))}
      <form onSubmit={pago} className="grid gap-2 rounded-[22px] border border-line bg-white p-4 md:grid-cols-4">
        <select name="facturaId" className={fieldClass} required>
          {data.facturas.filter((f) => f.estado !== 'pagada').map((f) => <option key={f.id} value={f.id}>{f.numero}</option>)}
        </select>
        <input name="monto" type="number" min="1" required placeholder="Monto" className={fieldClass} />
        <select name="metodo" className={fieldClass}>
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">Efectivo</option>
          <option value="pse">PSE</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
        <button className="rounded-2xl bg-pine text-sm font-bold text-white" type="submit">Registrar pago</button>
      </form>
    </div>
  );
}
