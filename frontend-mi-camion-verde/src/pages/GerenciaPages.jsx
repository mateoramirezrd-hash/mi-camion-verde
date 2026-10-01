import { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { cop, kg, mesCorto } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle, fieldClass } from '../components/ui';

async function descargarInforme() {
  const res = await fetch('/api/gerencia/reporte.csv', { headers: { Authorization: `Bearer ${getToken()}` } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'residuos-por-zona.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function GerenciaHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/gerencia/panel').then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const max = Math.max(...data.serie.map((s) => Number(s.kg)), 1);

  return (
    <div>
      <PageTitle
        title="Panorama estratégico"
        subtitle="Piloto Mi Camión Verde · barrios de Rionegro"
        action={<button type="button" onClick={descargarInforme} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold">Exportar informe</button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-moss">Material recuperado</p><p className="mt-2 text-3xl font-extrabold">{kg(data.recuperadoKg)} kg</p></Card>
        <Card className="p-4"><p className="text-xs text-moss">Hogares activos</p><p className="mt-2 text-3xl font-extrabold">{data.hogares}</p></Card>
        <Card className="p-4"><p className="text-xs text-moss">Incidencias abiertas</p><p className="mt-2 text-3xl font-extrabold">{data.incidencias}</p></Card>
        <Card className="p-4"><p className="text-xs text-moss">Ingresos registrados</p><p className="mt-2 text-3xl font-extrabold">{cop(data.ingresos)}</p></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-extrabold">Material recuperado</h2>
          <p className="text-xs text-moss">Kilogramos por mes</p>
          <div className="mt-4 flex h-56 items-end gap-2">
            {data.serie.map((s, i) => (
              <div key={s.mes} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-bold">{kg(s.kg)}</span>
                <div className={`w-full rounded-t-xl ${i === data.serie.length - 1 ? 'bg-gold' : 'bg-pine'}`} style={{ height: `${Math.max(12, (Number(s.kg) / max) * 160)}px` }} />
                <span className="text-[11px] text-moss">{mesCorto(s.mes)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-extrabold">Cobertura del piloto</h2>
          <img src="/brand/ruta-mapa.png" alt="Mapa del piloto en Rionegro" className="mt-3 h-40 w-full rounded-2xl object-cover" />
          <div className="mt-3 grid grid-cols-2 text-sm">
            <p><b>{data.zonas.filter((z) => z.es_piloto).length ? '1' : data.zonas.length}</b> zona piloto</p>
            <p className="text-right"><b>{data.zonas.length}</b> barrios cargados</p>
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="bg-mint/50 p-4">
          <h2 className="font-extrabold">Impacto ambiental y social</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <p><b className="block text-2xl">{kg(data.co2Kg)}</b><span className="text-xs">kg CO₂e evitados</span></p>
            <p><b className="block text-2xl">{data.arboles}</b><span className="text-xs">árboles equivalentes</span></p>
            <p><b className="block text-2xl">{data.empleos}</b><span className="text-xs">empleos verdes</span></p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><h2 className="font-extrabold">Salud financiera</h2><Chip>Estable</Chip></div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>Ingresos del mes</span><b>{cop(data.ingresosMes)}</b></li>
            <li className="flex justify-between"><span>Cartera pendiente</span><b>{data.cartera}%</b></li>
            <li className="flex justify-between"><span>Quejas abiertas</span><b>{data.quejas}</b></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function GerenciaImpacto() {
  return <GerenciaHome />;
}

export function GerenciaFinanzas() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/comercial/panel').then(setData).catch((err) => setError(err.message)); }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <div className="space-y-3">
      <PageTitle title="Salud financiera" subtitle="Facturas y pagos del piloto." />
      {data.facturas.map((f) => (
        <Card key={f.id} className="flex items-center justify-between p-4 text-sm">
          <div><p className="font-extrabold">{f.numero}</p><p className="text-moss">{f.cliente} · {f.plan}</p></div>
          <div className="text-right"><p className="font-extrabold">{cop(f.total)}</p><Chip tone={f.estado === 'pagada' ? 'green' : 'amber'}>{f.estado}</Chip></div>
        </Card>
      ))}
    </div>
  );
}

export function GerenciaBarrios() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/gerencia/panel').then(setData).catch((err) => setError(err.message)); }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <div className="space-y-3">
      <PageTitle title="Barrios del piloto" subtitle="Hogares y kilos recuperados por zona." />
      {data.zonas.map((z) => (
        <Card key={z.id} className="flex items-center justify-between p-4">
          <div>
            <p className="font-extrabold">{z.nombre}</p>
            <p className="text-sm text-moss">{z.hogares} hogares {z.es_piloto ? '· zona piloto' : ''}</p>
          </div>
          <p className="text-xl font-extrabold text-pine">{kg(z.kg)} kg</p>
        </Card>
      ))}
    </div>
  );
}

export function GerenciaUsuarios() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  function cargar() { api('/api/gerencia/usuarios').then(setData).catch((err) => setError(err.message)); }
  useEffect(cargar, []);

  async function crear(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await api('/api/gerencia/usuarios', {
        method: 'POST',
        body: { nombres: fd.get('nombres'), apellidos: fd.get('apellidos'), email: fd.get('email'), password: fd.get('password'), rol: fd.get('rol') },
      });
      event.currentTarget.reset();
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function estado(id, value) {
    await api(`/api/gerencia/usuarios/${id}`, { method: 'PATCH', body: { estado: value } });
    cargar();
  }

  if (!data && error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <div className="space-y-4">
      <PageTitle title="Usuarios y roles" subtitle="El cliente se registra solo. Los demás roles los crea gerencia." />
      {error && <ErrorNote>{error}</ErrorNote>}
      <form onSubmit={crear} className="grid gap-2 rounded-[22px] border border-line bg-white p-4 md:grid-cols-2">
        <input name="nombres" required placeholder="Nombres" className={fieldClass} />
        <input name="apellidos" required placeholder="Apellidos" className={fieldClass} />
        <input name="email" type="email" required placeholder="Correo" className={fieldClass} />
        <input name="password" type="password" minLength={8} required placeholder="Contraseña" className={fieldClass} />
        <select name="rol" className={fieldClass}>
          <option value="administrador_socio">Administrador y socio</option>
          <option value="directora_admin_comercial">Dirección comercial</option>
          <option value="gerente_general">Gerencia</option>
        </select>
        <button className="h-12 rounded-2xl bg-forest text-sm font-bold text-white" type="submit">Crear usuario</button>
      </form>
      {data.usuarios.map((u) => (
        <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-extrabold">{u.nombres} {u.apellidos}</p>
            <p className="text-moss">{u.email} · {u.rol}</p>
          </div>
          <select value={u.estado} onChange={(e) => estado(u.id, e.target.value)} className="rounded-full border border-line px-3 py-2">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </Card>
      ))}
    </div>
  );
}
