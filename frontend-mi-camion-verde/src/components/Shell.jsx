import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays, CirclePlus, ClipboardList, Download, House, LayoutDashboard,
  Menu, Recycle, Route, Search, Wifi, WifiOff,
} from 'lucide-react';
import { Brand, Chip } from './ui';
import { useAuth } from '../context/AuthContext';

const CLIENT_MOBILE = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/rutas', label: 'Rutas', icon: CalendarDays },
  { to: '/reportes/nuevo', label: 'Reportar', icon: CirclePlus },
  { to: '/guia', label: 'Guía', icon: Recycle },
  { to: '/mas', label: 'Más', icon: Menu },
];

const CLIENT_TABLET = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/rutas', label: 'Rutas' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/guia', label: 'Guía' },
  { to: '/solicitudes', label: 'Solicitudes' },
];

const CLIENT_DESKTOP = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/rutas', label: 'Rutas', icon: Route },
  { to: '/reportes', label: 'Incidencias', icon: ClipboardList },
  { to: '/solicitudes', label: 'Solicitudes', icon: CalendarDays },
  { to: '/facturacion', label: 'Facturación', icon: ClipboardList },
  { to: '/guia', label: 'Guía', icon: Recycle },
];

const ADMIN_NAV = [
  { to: '/operacion', label: 'Operación', icon: LayoutDashboard, end: true },
  { to: '/operacion/rutas', label: 'Rutas', icon: Route },
  { to: '/operacion/quejas', label: 'Reportes', icon: ClipboardList },
  { to: '/comercial', label: 'Facturación', icon: ClipboardList },
];

const GERENCIA_NAV = [
  { to: '/gerencia', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/gerencia/impacto', label: 'Impacto', icon: Recycle },
  { to: '/gerencia/finanzas', label: 'Finanzas', icon: ClipboardList },
  { to: '/gerencia/barrios', label: 'Barrios', icon: Route },
  { to: '/gerencia/usuarios', label: 'Usuarios', icon: House },
];

const COMERCIAL_NAV = [
  { to: '/comercial', label: 'Facturación', icon: LayoutDashboard, end: true },
];

const MOBILE_TITLES = {
  '/rutas': ['Calendario y rutas', Recycle],
  '/reportes': ['Incidencias', ClipboardList],
  '/reportes/nuevo': ['Crear reporte', CirclePlus],
  '/guia': ['Guía de separación', Recycle],
  '/solicitudes': ['Solicitudes e impacto', CalendarDays],
  '/facturacion': ['Facturación', ClipboardList],
  '/mas': ['Tu cuenta', House],
  '/operacion': ['Control de operación', LayoutDashboard],
  '/operacion/rutas': ['Rutas y horarios', Route],
  '/operacion/quejas': ['Quejas y reportes', ClipboardList],
  '/gerencia': ['Panorama estratégico', LayoutDashboard],
  '/gerencia/impacto': ['Impacto', Recycle],
  '/gerencia/finanzas': ['Salud financiera', ClipboardList],
  '/gerencia/barrios': ['Barrios del piloto', Route],
  '/gerencia/usuarios': ['Usuarios y roles', House],
  '/comercial': ['Planes y cartera', ClipboardList],
};

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function useInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }
  return { canInstall: Boolean(prompt) && !installed, installed, install };
}

function navItems(rol) {
  if (rol === 'administrador_socio') return ADMIN_NAV;
  if (rol === 'gerente_general') return GERENCIA_NAV;
  if (rol === 'directora_admin_comercial') return COMERCIAL_NAV;
  return CLIENT_DESKTOP;
}

export default function Shell() {
  const { user, avisoSync, setAvisoSync } = useAuth();
  const online = useOnline();
  const install = useInstall();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = navItems(user?.rol);
  const cliente = user?.rol === 'cliente';
  const title = MOBILE_TITLES[pathname];
  const initials = (user?.nombre || 'MC')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-leaf text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-sidebar px-5 py-7 text-white lg:flex">
        <Brand />
        <div className="mt-6">
          {install.installed ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-foam">
              <Download size={13} /> PWA instalada
            </span>
          ) : install.canInstall ? (
            <button type="button" onClick={install.install} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Download size={13} /> Instalar app
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-foam">
              <Wifi size={13} /> {online ? 'En línea' : 'Sin conexión'}
            </span>
          )}
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Secciones">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold ${
                  isActive ? 'bg-gold text-ink' : 'text-white/85 hover:bg-white/10'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-white/10 px-3 py-3 text-sm">
          <p className="text-xs text-foam">{rolLegible(user?.rol)}</p>
          <p className="font-bold">{user?.nombre}</p>
        </div>
      </aside>

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-[72px] items-center gap-3 px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
              {pathname === '/' && cliente ? (
                <Brand compact />
              ) : (
                <>
                  <button type="button" onClick={() => navigate(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-lg text-pine" aria-label="Volver">
                    ←
                  </button>
                  <p className="truncate text-base font-extrabold">{title?.[0] || 'Mi Camión Verde'}</p>
                </>
              )}
            </div>
            <div className="hidden min-w-0 items-center gap-3 md:flex lg:hidden">
              <Brand />
            </div>
            {cliente && (
              <nav className="hidden items-center gap-5 text-sm font-semibold md:flex lg:hidden" aria-label="Secciones">
                {CLIENT_TABLET.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'text-pine' : 'text-moss')}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
            <form
              className="hidden max-w-md flex-1 lg:block"
              onSubmit={(event) => {
                event.preventDefault();
                const q = new FormData(event.currentTarget).get('q');
                navigate(cliente ? `/guia?q=${encodeURIComponent(q)}` : `/operacion/quejas?q=${encodeURIComponent(q)}`);
              }}
            >
              <label className="relative block">
                <span className="sr-only">Buscar</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" />
                <input name="q" placeholder="Buscar ruta, reporte o material" className="w-full rounded-full border border-line bg-leaf py-2 pl-9 pr-4 text-sm" />
              </label>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Chip tone={online ? 'green' : 'amber'}>
                {online ? <Wifi size={13} /> : <WifiOff size={13} />}
                {online ? 'En línea' : 'Sin conexión'}
              </Chip>
              <span className="hidden h-10 w-10 place-items-center rounded-full bg-forest text-xs font-bold text-white md:grid" aria-hidden>
                {initials}
              </span>
            </div>
          </div>
          {!cliente && (
            <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Secciones">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${isActive ? 'bg-forest text-white' : 'bg-mint text-pine'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        {avisoSync && (
          <button type="button" onClick={() => setAvisoSync('')} className="mx-4 mt-3 block rounded-2xl bg-mint px-4 py-2 text-left text-sm font-semibold text-ok md:mx-6">
            {avisoSync}
          </button>
        )}

        <main className="px-[18px] py-[18px] pb-28 md:px-6 md:pb-10 lg:px-8">
          <Outlet context={{ online, install }} />
        </main>

        {cliente && (
          <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[74px] items-start justify-around border-t border-line bg-white px-2 pt-2 md:hidden" aria-label="Principal">
            {CLIENT_MOBILE.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex w-16 flex-col items-center gap-1 text-[10px] font-bold ${isActive ? 'text-pine' : 'text-moss'}`}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function rolLegible(rol) {
  return {
    cliente: 'Cliente',
    administrador_socio: 'Operaciones',
    gerente_general: 'Gerencia',
    directora_admin_comercial: 'Comercial',
  }[rol] || 'Equipo';
}
