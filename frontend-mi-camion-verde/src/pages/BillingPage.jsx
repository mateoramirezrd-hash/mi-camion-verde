import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { cop, fechaCorta } from '../lib/format';
import { Card, Chip, ErrorNote, Loading, PageTitle } from '../components/ui';

export default function BillingPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/cliente/facturacion').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;

  return (
    <div>
      <PageTitle title="Facturación" subtitle="Tu plan, tus facturas y lo que ya pagaste." />
      <div className="space-y-3">
        {data.facturas.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-moss">{f.numero}</p>
                <p className="text-lg font-extrabold">{f.plan}</p>
                <p className="text-sm text-moss">Vence {fechaCorta(f.fecha_vencimiento)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold">{cop(f.total)}</p>
                <Chip tone={f.estado === 'pagada' ? 'green' : 'amber'}>{f.estado}</Chip>
              </div>
            </div>
          </Card>
        ))}
        {!data.facturas.length && <p className="text-sm text-moss">Todavía no tienes facturas. <Link to="/solicitudes" className="font-bold text-pine">Ver tu plan</Link></p>}
      </div>
    </div>
  );
}
