import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Apple, ChevronRight, CupSoda, FileText, Recycle, Search, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { Card, ErrorNote, Loading, PageTitle } from '../components/ui';

const ICONOS = {
  'Papel y cartón': FileText,
  Plásticos: Recycle,
  'Vidrio y metales': CupSoda,
  Orgánicos: Apple,
};

const FONDOS = {
  'Papel y cartón': 'bg-mint text-ok',
  Plásticos: 'bg-sky-100 text-sky-700',
  'Vidrio y metales': 'bg-cream text-warn',
  Orgánicos: 'bg-mint text-ok',
};

export default function GuidePage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [items, setItems] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      api(`/api/cliente/guia?q=${encodeURIComponent(q)}`)
        .then((data) => setItems(data.items))
        .catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div>
      <PageTitle title="Guía de separación" subtitle="Consulta qué va en cada bolsa antes de sacar tus residuos." />
      <div className="md:hidden">
        <h2 className="text-[26px] font-extrabold leading-tight">Separar bien transforma tu barrio</h2>
        <p className="mt-2 text-sm text-moss">Consulta qué va en cada bolsa antes de sacar tus residuos.</p>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
        <Search size={18} className="text-moss" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
          placeholder="Buscar: icopor, aceite, pilas..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <article className="mt-4 rounded-[22px] bg-forest p-4 text-white">
        <p className="flex items-center gap-2 text-xs font-extrabold text-gold"><Sparkles size={14} /> REGLA DE ORO</p>
        <p className="mt-2 text-lg font-extrabold leading-snug">Reciclables siempre limpios, secos y sin restos de comida.</p>
      </article>
      <h2 className="mt-6 text-xl font-extrabold">¿Dónde va cada cosa?</h2>
      {!items && <Loading />}
      <div className="mt-3 space-y-3">
        {items?.map((item) => {
          const Icon = ICONOS[item.titulo] || FileText;
          const abiertoEste = abierto === item.id;
          return (
            <Card key={item.id}>
              <button type="button" onClick={() => setAbierto(abiertoEste ? null : item.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${FONDOS[item.titulo] || 'bg-mint text-ok'}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{item.titulo}</span>
                  <span className="block text-sm text-moss">{item.resumen}</span>
                </span>
                <ChevronRight size={18} className={`text-moss transition ${abiertoEste ? 'rotate-90' : ''}`} />
              </button>
              {abiertoEste && <p className="px-4 pb-4 text-sm leading-relaxed text-moss">{item.contenido}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
