export function fechaLarga(iso) {
  const date = iso ? new Date(`${iso}T12:00:00`) : new Date();
  const text = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function mesLargo(isoMes) {
  const [year, month] = isoMes.split('-').map(Number);
  const text = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function mesCorto(isoMes) {
  const [year, month] = isoMes.split('-').map(Number);
  const text = new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(year, month - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1, 3);
}

export function cop(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function kg(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-CO', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

export function hace(fecha) {
  if (!fecha) return '';
  const time = new Date(String(fecha).replace(' ', 'T'));
  const hours = Math.round((Date.now() - time.getTime()) / 3600000);
  if (Number.isNaN(hours)) return '';
  if (hours < 1) return 'Hace un momento';
  if (hours < 24) return `Hace ${hours} h`;
  if (hours < 48) return 'Ayer';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(time);
}

export function fechaCorta(iso) {
  if (!iso) return '';
  const date = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const text = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date);
  return text.replace('.', '');
}
