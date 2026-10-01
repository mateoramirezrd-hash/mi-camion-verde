import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Download, House, Leaf, MapPin, Recycle, Route, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { cop, fechaLarga, kg } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';
import { useOutletContext } from 'react-router-dom';

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const { install } = useOutletContext();
  const navigate = useNavigate();

  useEffect(() => {
    api('/api/cliente/resumen').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  const minutos = data.proximo ? `En ${data.proximo.minutos} min` : 'Sin horario';

  return (
    <div>
      <PageTitle
        title={`Buenos días, ${data.zona}`}
        subtitle={`Así se mueve la recolección hoy en ${data.municipio}.`}
        action={
          <button type="button" onClick={() => navigate('/reportes/nuevo')} className="inline-flex items-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-bold text-white">
            <Camera size={18} /> Crear reporte
          </button>
        }
      />

      <section className="md:hidden">
        <p className="text-[26px] font-extrabold leading-tight">¡Hola, {data.zona}!</p>
        <p className="mt-1 text-sm text-moss">{fechaLarga(data.fecha)} · {data.municipio}</p>
        <NextCard data={data} minutos={minutos} />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link to="/reportes/nuevo" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-pine text-sm font-bold text-white">
            <Camera size={18} /> Reportar
          </Link>
          <Link to="/rutas" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-foam bg-white text-sm font-bold text-forest">
            <Route size={18} /> Ver ruta
          </Link>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Hoy en tu barrio</h2>
          <Link to="/reportes" className="text-xs font-bold text-pine">Ver todo</Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Card className="bg-cream p-3">
            <Chip tone="amber">Aviso</Chip>
            <p className="mt-2 text-xs font-bold">{data.aviso}</p>
          </Card>
          <Card className="p-3">
            <Chip>Impacto</Chip>
            <p className="mt-2 text-xs font-bold">{kg(data.kgMes)} kg recuperados este mes</p>
          </Card>
        </div>
      </section>

      <section className="hidden gap-5 md:grid lg:hidden">
        <div className="grid grid-cols-[1.4fr_1fr] gap-5">
          <NextCard data={data} minutos={minutos} wide />
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">Agenda de hoy</h2>
              <Link to="/rutas" className="text-sm font-bold text-pine">Calendario</Link>
            </div>
            <div className="space-y-3">
              {(data.agenda.length ? data.agenda : [{ hora: data.proximo?.hora, titulo: data.proximo?.titulo, lugar: data.unidad, estado: 'confirmada' }]).map((item) => (
                <Card key={item.titulo} className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">{item.hora}</span>
                    <Chip>Confirmada</Chip>
                  </div>
                  <p className="mt-2 text-lg font-extrabold">{item.titulo}</p>
                  <p className="text-sm text-moss">{item.lugar || data.unidad}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <StatRow data={data} />
      </section>

      <section className="hidden lg:block">
        <p className="mb-4 text-sm text-moss">{data.unidad} · {data.municipio}, Antioquia</p>
        <div className="grid grid-cols-4 gap-4">
          <Stat kicker="Próxima recolección" value={data.proximo ? `${data.proximo.minutos} min` : '—'} note={`${data.proximo?.rutaCorta || 'Ruta'} · ${data.proximo?.tipo || ''}`} icon={Truck} />
          <Stat kicker="Recuperado en octubre" value={`${kg(data.kgMes)} kg`} note={data.delta != null ? `↑ ${data.delta}% este mes` : 'Primer mes con datos'} icon={Recycle} />
          <Stat kicker="Solicitudes activas" value={data.solicitudesActivas} note={`${data.solicitudesConfirmadas} visita confirmada`} icon={ClipboardMini} />
          <Stat kicker="Saldo del plan" value={cop(data.saldo)} note={data.plan?.alDia ? `Al día · vence ${data.plan.vencimiento?.slice(8, 10)} ${mes(data.plan.vencimiento)}` : 'Pendiente'} icon={House} />
        </div>
        <div className="mt-4 grid grid-cols-[1.5fr_0.9fr] gap-4">
          <Card className="overflow-hidden">
            <div className="relative h-64">
              <img src="/brand/ruta-mapa.png" alt="Mapa de la ruta de recolección" className="h-full w-full object-cover" />
              <div className="absolute left-3 top-3"><Chip><Truck size={13} /> Seguimiento en vivo</Chip></div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-extrabold">{data.proximo?.rutaCorta || 'Ruta'} · {data.zona}</p>
                <p className="text-sm text-moss">Tu parada estimada: {data.proximo?.hora || 'por confirmar'}.</p>
              </div>
              <Link to="/rutas" className="inline-flex items-center gap-2 rounded-full border border-foam px-4 py-2 text-sm font-bold text-forest">
                <Route size={16} /> Ver ruta
              </Link>
            </div>
          </Card>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Próximos servicios</h2>
              <Link to="/rutas" className="text-sm font-bold text-pine">Ver calendario</Link>
            </div>
            <ServiceList data={data} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-xl font-extrabold">Impacto de la unidad</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Impact n={kg(data.impacto.recuperadoKg / 1000)} u="t" label="material recuperado" />
              <Impact n={kg(data.impacto.co2Kg / 1000)} u="t" label="CO₂e evitado" />
              <Impact n={`${data.impacto.separacion}%`} label="separación correcta" />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-extrabold">{data.plan?.nombre || 'Sin plan'}</h2>
              {data.plan?.alDia && <Chip>Al día</Chip>}
            </div>
            <p className="mt-3 text-3xl font-extrabold text-pine">{data.plan ? cop(data.plan.precio) : '—'} <span className="text-base font-semibold text-moss">/ mes</span></p>
            <p className="mt-1 text-sm text-moss">{data.plan?.factura ? `Factura ${data.plan.factura} · débito al día` : 'Aún no hay factura'}</p>
          </Card>
        </div>
      </section>

      {install?.canInstall && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gold bg-cream px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Download size={16} /> Instala Mi Camión Verde para recibir alertas incluso con conexión limitada.</p>
          <button type="button" onClick={install.install} className="shrink-0 font-bold text-amber">Instalar ahora</button>
        </div>
      )}
    </div>
  );
}

function NextCard({ data, minutos, wide }) {
  return (
    <article className="mt-4 overflow-hidden rounded-[22px] bg-forest text-white shadow-[0_6px_9px_rgba(23,63,34,0.08)] md:mt-0">
      <div className="relative h-28 md:h-40">
        <img src="/brand/ruta-mapa.png" alt="" className="h-full w-full object-cover" />
        <div className="absolute left-3 top-3"><Chip><Truck size={13} /> {data.proximo?.estado === 'en_ruta' ? 'En ruta' : 'Programado'}</Chip></div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-gold">{wide ? 'PRÓXIMA RECOLECCIÓN' : 'PRÓXIMO PASO'}</span>
          <span>{minutos}</span>
        </div>
        <h2 className="text-[22px] font-extrabold leading-tight">
          {wide ? `${data.proximo?.tipo === 'reciclable' ? 'Reciclables' : 'Recolección'} · ${data.proximo?.rutaCorta || ''}` : data.proximo?.titulo || 'Aún no hay un paso programado'}
        </h2>
        <p className="flex items-center gap-2 text-xs text-foam">
          <MapPin size={16} /> {data.proximo?.rutaCorta} · {data.proximo?.detalle}
        </p>
      </div>
    </article>
  );
}

function StatRow({ data }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat kicker="Recuperado este mes" value={`${kg(data.kgMes)} kg`} note={data.delta != null ? `↑ ${data.delta}% vs. el mes anterior` : 'Este mes'} icon={Recycle} />
      <Stat kicker="Reportes activos" value={data.reportesActivos} note={`${data.reportesConRespuesta} con respuesta hoy`} icon={Camera} />
      <Stat kicker="Aporte de tu unidad" value={`${data.co2} kg CO₂e`} note="equivalente evitado" icon={Leaf} />
    </div>
  );
}

function Stat({ kicker, value, note, icon }) {
  const Glyph = icon;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-moss">
        <span>{kicker}</span>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-mint text-ok"><Glyph size={16} /></span>
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ok">{note}</p>
    </Card>
  );
}

function Impact({ n, u, label }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-pine">{n}{u ? <span className="text-lg"> {u}</span> : null}</p>
      <p className="text-xs text-moss">{label}</p>
    </div>
  );
}

function ServiceList({ data }) {
  const items = data.agenda.length
    ? data.agenda
    : [{ hora: data.proximo?.hora, titulo: data.proximo?.titulo || 'Sin servicio', estado: 'programada' }];
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.titulo} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-moss">HOY · {item.hora}</span>
            <Chip tone={item.estado === 'programada' ? 'blue' : 'green'}>{item.estado === 'programada' ? 'Programada' : 'En ruta'}</Chip>
          </div>
          <p className="mt-1 font-extrabold">{item.titulo}</p>
        </Card>
      ))}
    </div>
  );
}

function ClipboardMini(props) {
  return <House {...props} />;
}

function mes(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(`${iso}T12:00:00`));
}
