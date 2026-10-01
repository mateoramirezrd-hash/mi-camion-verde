export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/brand/truck-mark.svg" alt="" width={36} height={31} />
      <p className={`font-extrabold text-pine ${compact ? 'text-base' : 'text-base'}`}>
        Mi Camión <span className="text-amber">Verde</span>
      </p>
    </div>
  );
}

export function Chip({ tone = 'green', children }) {
  const tones = {
    green: 'bg-mint text-ok',
    amber: 'bg-cream text-warn',
    blue: 'bg-sky-100 text-sky-800',
    gold: 'bg-gold/30 text-amber',
    white: 'bg-white text-moss border border-line',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ className = '', children }) {
  return (
    <section className={`rounded-[22px] border border-line bg-white shadow-[0_6px_9px_rgba(23,63,34,0.06)] ${className}`}>
      {children}
    </section>
  );
}

export const fieldClass =
  'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-pine';

export function Loading() {
  return <p className="py-8 text-sm text-moss">Cargando la información de tu zona…</p>;
}

export function ErrorNote({ children }) {
  return <p className="rounded-2xl bg-cream px-4 py-3 text-sm font-medium text-warn">{children}</p>;
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 hidden items-end justify-between gap-4 md:flex">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-moss">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
