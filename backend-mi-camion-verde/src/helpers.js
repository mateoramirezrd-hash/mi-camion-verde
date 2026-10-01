const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function bogotaNow(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dow: map[parts.weekday],
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function formatHora(time) {
  if (!time) return '';
  const [hRaw, mRaw] = String(time).split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

function tituloRecoleccion(tipo, hora) {
  const cuando = formatHora(hora);
  if (tipo === 'reciclable') return `Saca reciclables antes de las ${cuando}`;
  if (tipo === 'organica') return `Saca orgánicos antes de las ${cuando}`;
  return `Saca los residuos ordinarios antes de las ${cuando}`;
}

function etiquetaTipo(tipo) {
  if (tipo === 'reciclable') return 'Reciclables';
  if (tipo === 'organica') return 'Orgánicos';
  return 'Ordinarios';
}

function siguientePaso(horarios, now = new Date()) {
  const b = bogotaNow(now);
  const ahoraMin = b.dow * 24 * 60 + b.hour * 60 + b.minute;
  let mejor = null;

  for (const h of horarios) {
    const idx = DIAS.indexOf(h.dia_semana);
    if (idx < 0) continue;
    const [hh, mm] = String(h.hora_paso).split(':').map(Number);
    let minutos = idx * 24 * 60 + hh * 60 + mm;
    if (minutos <= ahoraMin) minutos += 7 * 24 * 60;
    const falta = minutos - ahoraMin;
    if (!mejor || falta < mejor.falta) {
      mejor = { ...h, falta };
    }
  }

  if (!mejor) return null;
  const enRuta = mejor.falta <= 90;
  return {
    minutos: mejor.falta,
    tipo: mejor.tipo_recoleccion,
    titulo: tituloRecoleccion(mejor.tipo_recoleccion, mejor.hora_paso),
    ruta: mejor.ruta,
    detalle: mejor.detalle || mejor.zona,
    hora: formatHora(mejor.hora_paso),
    hora24: String(mejor.hora_paso).slice(0, 5),
    dia: mejor.dia_semana,
    estado: enRuta ? 'en_ruta' : 'programada',
  };
}

function co2e(kg) {
  return Math.round(Number(kg || 0) * 1.64);
}

function arboles(kg) {
  return Math.max(0, Math.round(Number(kg || 0) / 22.8));
}

function fechaISO(b) {
  return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
}

async function auditar(conn, { usuarioId, accion, entidad, entidadId, detalle, ip }) {
  await conn.query(
    'INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip) VALUES (?,?,?,?,?,?)',
    [usuarioId || null, accion, entidad, entidadId || null, detalle ? JSON.stringify(detalle) : null, ip || null],
  );
}

async function notificar(conn, { usuarioId, tipo, titulo, mensaje, referenciaTipo, referenciaId }) {
  await conn.query(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tipo, referencia_id)
     VALUES (?,?,?,?,?,?)`,
    [usuarioId, tipo, titulo, mensaje, referenciaTipo || null, referenciaId || null],
  );
}

module.exports = {
  DIAS,
  bogotaNow,
  formatHora,
  etiquetaTipo,
  siguientePaso,
  co2e,
  arboles,
  fechaISO,
  auditar,
  notificar,
};
