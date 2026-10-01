const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, allow } = require('../middleware');
const {
  DIAS, bogotaNow, formatHora, etiquetaTipo, siguientePaso, co2e, arboles, fechaISO, notificar,
} = require('../helpers');

const router = express.Router();
router.use(requireAuth, allow('cliente'));

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('La foto debe ser JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

async function contexto(usuarioId) {
  const [rows] = await pool.query(
    `SELECT c.id AS cliente_id, c.nombre_comercial, d.id AS direccion_id, d.direccion,
            d.latitud, d.longitud, d.referencia, z.id AS zona_id, z.nombre AS zona, z.municipio
     FROM clientes c
     LEFT JOIN direcciones d ON d.cliente_id = c.id AND d.es_principal = 1
     LEFT JOIN zonas z ON z.id = d.zona_id
     WHERE c.usuario_id = ?
     LIMIT 1`,
    [usuarioId],
  );
  return rows[0] || null;
}

async function horariosDeZona(zonaId) {
  if (!zonaId) return [];
  const [rows] = await pool.query(
    `SELECT h.dia_semana, h.hora_paso, h.tipo_recoleccion, ru.nombre AS ruta, z.nombre AS zona
     FROM horarios_ruta h
     JOIN rutas ru ON ru.id = h.ruta_id AND ru.activa = 1
     JOIN zonas z ON z.id = ru.zona_id
     WHERE h.activo = 1 AND z.id = ?
     ORDER BY h.hora_paso`,
    [zonaId],
  );
  return rows;
}

router.get('/resumen', async (req, res) => {
  const ctx = await contexto(req.user.id);
  if (!ctx) return res.status(404).json({ error: 'No encontramos tu perfil de cliente' });
  const horarios = await horariosDeZona(ctx.zona_id);
  const proximo = siguientePaso(horarios);
  if (proximo) {
    const sector = proximo.ruta.includes('·') ? proximo.ruta.split('·')[1].trim() : proximo.zona;
    proximo.rutaCorta = proximo.ruta.split('·')[0].trim();
    proximo.detalle = ctx.direccion ? `${ctx.direccion.split('#')[0].trim()}, sector ${sector}` : sector;
  }

  const [kgRows] = await pool.query(
    `SELECT COALESCE(SUM(rd.peso_kg), 0) AS kg
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id AND r.estado = 'finalizada'
     JOIN solicitudes_recoleccion s ON s.id = r.solicitud_id
     JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id
     WHERE s.cliente_id = ?
       AND tr.categoria IN ('reciclable', 'organico')
       AND DATE_FORMAT(r.fecha_hora_fin, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')`,
    [ctx.cliente_id],
  );
  const kgMes = Number(kgRows[0].kg);

  const [anterior] = await pool.query(
    `SELECT COALESCE(SUM(rd.peso_kg), 0) AS kg
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id AND r.estado = 'finalizada'
     JOIN solicitudes_recoleccion s ON s.id = r.solicitud_id
     JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id
     WHERE s.cliente_id = ?
       AND tr.categoria IN ('reciclable', 'organico')
       AND DATE_FORMAT(r.fecha_hora_fin, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')`,
    [ctx.cliente_id],
  );
  const kgAnt = Number(anterior[0].kg);
  const delta = kgAnt > 0 ? Math.round(((kgMes - kgAnt) / kgAnt) * 100) : null;

  const [quejas] = await pool.query(
    `SELECT COUNT(*) AS activas,
            SUM(CASE WHEN respuesta IS NOT NULL AND DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) AS con_respuesta
     FROM quejas_reportes
     WHERE cliente_id = ? AND estado NOT IN ('resuelto', 'rechazado')`,
    [ctx.cliente_id],
  );
  const [sols] = await pool.query(
    `SELECT COUNT(*) AS activas,
            SUM(CASE WHEN estado IN ('programada', 'en_camino') THEN 1 ELSE 0 END) AS confirmadas
     FROM solicitudes_recoleccion
     WHERE cliente_id = ? AND estado IN ('pendiente', 'programada', 'en_camino')`,
    [ctx.cliente_id],
  );

  const [planRows] = await pool.query(
    `SELECT p.nombre, p.precio, f.numero, f.fecha_vencimiento, f.estado, f.total,
            COALESCE((SELECT SUM(monto) FROM pagos WHERE factura_id = f.id), 0) AS pagado
     FROM suscripciones s
     JOIN planes p ON p.id = s.plan_id
     LEFT JOIN facturas f ON f.suscripcion_id = s.id
     WHERE s.cliente_id = ? AND s.estado = 'activa'
     ORDER BY f.fecha_vencimiento DESC
     LIMIT 1`,
    [ctx.cliente_id],
  );
  const plan = planRows[0] || null;
  const saldo = plan ? Math.max(0, Number(plan.total || 0) - Number(plan.pagado || 0)) : 0;

  const [anio] = await pool.query(
    `SELECT
        COALESCE(SUM(CASE WHEN tr.categoria IN ('reciclable','organico') THEN rd.peso_kg ELSE 0 END), 0) AS recuperado,
        COALESCE(SUM(rd.peso_kg), 0) AS total
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id AND r.estado = 'finalizada'
     JOIN solicitudes_recoleccion s ON s.id = r.solicitud_id
     JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id
     WHERE s.cliente_id = ? AND YEAR(r.fecha_hora_fin) = YEAR(NOW())`,
    [ctx.cliente_id],
  );
  const recuperado = Number(anio[0].recuperado);
  const total = Number(anio[0].total);

  const [aviso] = await pool.query(
    `SELECT titulo, mensaje FROM notificaciones
     WHERE usuario_id = ? AND tipo = 'sistema'
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id],
  );

  const b = bogotaNow();
  const agenda = horarios
    .filter((h) => DIAS[b.dow] === h.dia_semana)
    .map((h) => ({
      hora: formatHora(h.hora_paso),
      titulo: etiquetaTipo(h.tipo_recoleccion),
      lugar: 'Portería principal · Unidad El Porvenir',
      estado: 'confirmada',
    }));

  res.json({
    zona: ctx.zona,
    municipio: ctx.municipio,
    unidad: ctx.nombre_comercial || ctx.direccion,
    direccion: ctx.direccion,
    fecha: fechaISO(b),
    proximo,
    agenda,
    aviso: aviso[0] ? aviso[0].mensaje : 'Separa limpio y seco antes de sacar las bolsas',
    kgMes,
    delta,
    co2: co2e(kgMes),
    arboles: arboles(kgMes),
    reportesActivos: Number(quejas[0].activas || 0),
    reportesConRespuesta: Number(quejas[0].con_respuesta || 0),
    solicitudesActivas: Number(sols[0].activas || 0),
    solicitudesConfirmadas: Number(sols[0].confirmadas || 0),
    saldo,
    plan: plan
      ? {
          nombre: plan.nombre,
          precio: Number(plan.precio),
          factura: plan.numero,
          vencimiento: plan.fecha_vencimiento,
          alDia: plan.estado === 'pagada' || saldo === 0,
        }
      : null,
    impacto: {
      recuperadoKg: recuperado,
      co2Kg: co2e(recuperado),
      separacion: total > 0 ? Math.round((recuperado / total) * 100) : 0,
    },
  });
});

router.get('/calendario', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const horarios = await horariosDeZona(ctx?.zona_id);
  const b = bogotaNow();
  const [year, month] = (req.query.mes || fechaISO(b).slice(0, 7)).split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dias = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const dow = date.getUTCDay();
    const delDia = horarios.filter((h) => DIAS[dow] === h.dia_semana);
    dias.push({
      fecha: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dia: day,
      dow,
      reciclable: delDia.some((h) => h.tipo_recoleccion === 'reciclable'),
      ordinario: delDia.some((h) => h.tipo_recoleccion === 'ordinaria'),
      organico: delDia.some((h) => h.tipo_recoleccion === 'organica'),
      esHoy: year === b.year && month === b.month && day === b.day,
    });
  }

  const [solicitudes] = await pool.query(
    `SELECT id, fecha_programada, franja, estado, observaciones
     FROM solicitudes_recoleccion
     WHERE cliente_id = ? AND estado NOT IN ('cancelada', 'completada')
       AND fecha_programada >= CURDATE()
     ORDER BY fecha_programada
     LIMIT 6`,
    [ctx.cliente_id],
  );

  const hoy = fechaISO(b);
  const ahora = b.hour * 60 + b.minute;
  const proximas = [];
  for (const h of horarios) {
    const idx = DIAS.indexOf(h.dia_semana);
    let delta = (idx - b.dow + 7) % 7;
    const [hh, mm] = String(h.hora_paso).split(':').map(Number);
    if (delta === 0 && hh * 60 + mm < ahora - 30) delta = 7;
    const fecha = new Date(Date.UTC(b.year, b.month - 1, b.day + delta));
    const fechaTxt = fecha.toISOString().slice(0, 10);
    const enCurso = delta === 0 && Math.abs(hh * 60 + mm - ahora) <= 90;
    proximas.push({
      hora: delta === 0 ? formatHora(h.hora_paso) : `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][idx]} · ${formatHora(h.hora_paso)}`,
      titulo: `${h.ruta.split('·')[0].trim()} · ${etiquetaTipo(h.tipo_recoleccion)}`,
      trayecto: `${h.ruta.includes('·') ? h.ruta.split('·')[1].trim() : h.ruta} → ${h.zona}`,
      estado: enCurso ? 'en_curso' : 'programada',
      fecha: fechaTxt,
      tipo: h.tipo_recoleccion,
    });
  }
  for (const s of solicitudes) {
    proximas.push({
      hora: `${new Date(`${s.fecha_programada}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short' })} · ${s.franja === 'manana' ? '8:00 a. m.' : '2:00 p. m.'}`,
      titulo: s.observaciones || 'Solicitud especial',
      trayecto: 'Parque principal del barrio',
      estado: 'especial',
      fecha: s.fecha_programada,
      tipo: 'especial',
    });
  }
  proximas.sort((a, b2) => String(a.fecha).localeCompare(String(b2.fecha)));

  res.json({ mes: `${year}-${String(month).padStart(2, '0')}`, hoy, dias, proximas: proximas.slice(0, 6) });
});

function etiquetaQueja(estado) {
  return {
    recibido: 'Programada',
    en_revision: 'En revisión',
    en_atencion: 'Asignada',
    resuelto: 'Resuelta',
    rechazado: 'Rechazada',
  }[estado] || estado;
}

function progresoQueja(estado) {
  return { recibido: 28, en_revision: 55, en_atencion: 78, resuelto: 100, rechazado: 100 }[estado] || 20;
}

router.get('/quejas', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const [rows] = await pool.query(
    `SELECT q.id, q.tipo, q.descripcion, q.referencia_ubicacion, q.estado, q.respuesta, q.created_at,
            (SELECT url FROM queja_evidencias e WHERE e.queja_id = q.id LIMIT 1) AS foto
     FROM quejas_reportes q
     WHERE q.cliente_id = ?
     ORDER BY q.created_at DESC`,
    [ctx.cliente_id],
  );
  const [conteo] = await pool.query(
    `SELECT
        SUM(estado NOT IN ('resuelto','rechazado')) AS activas,
        SUM(estado IN ('resuelto','rechazado')) AS resueltas,
        COUNT(*) AS todas
     FROM quejas_reportes WHERE cliente_id = ?`,
    [ctx.cliente_id],
  );
  res.json({
    conteo: {
      activas: Number(conteo[0].activas || 0),
      resueltas: Number(conteo[0].resueltas || 0),
      todas: Number(conteo[0].todas || 0),
    },
    quejas: rows.map((q) => ({
      ...q,
      codigo: `MCV-${q.id}`,
      etiqueta: etiquetaQueja(q.estado),
      progreso: progresoQueja(q.estado),
    })),
  });
});

router.post('/quejas', (req, res, next) => {
  upload.array('fotos', 3)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  const ctx = await contexto(req.user.id);
  const tipo = req.body.tipo;
  const permitidos = ['acumulacion_residuos', 'contenedor_danado', 'falla_servicio', 'sugerencia', 'inquietud'];
  if (!permitidos.includes(tipo)) return res.status(400).json({ error: 'Elige un tipo de reporte' });
  const descripcion = String(req.body.descripcion || '').trim();
  if (descripcion.length < 8) return res.status(400).json({ error: 'Cuéntanos un poco más, al menos una frase' });

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO quejas_reportes
        (cliente_id, zona_id, tipo, descripcion, latitud, longitud, referencia_ubicacion)
       VALUES (?,?,?,?,?,?,?)`,
      [
        ctx.cliente_id,
        ctx.zona_id,
        tipo,
        descripcion,
        req.body.latitud || ctx.latitud,
        req.body.longitud || ctx.longitud,
        req.body.referencia || ctx.direccion,
      ],
    );
    for (const file of req.files || []) {
      await conn.query(
        'INSERT INTO queja_evidencias (queja_id, url, tipo) VALUES (?,?,?)',
        [result.insertId, `/uploads/${file.filename}`, 'foto'],
      );
    }
    await notificar(conn, {
      usuarioId: req.user.id,
      tipo: 'respuesta_queja',
      titulo: 'Recibimos tu reporte',
      mensaje: `El reporte MCV-${result.insertId} quedó en estado recibido.`,
      referenciaTipo: 'queja',
      referenciaId: result.insertId,
    });
    res.status(201).json({ id: result.insertId, codigo: `MCV-${result.insertId}` });
  } finally {
    conn.release();
  }
});

router.get('/guia', async (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  const [rows] = await pool.query(
    `SELECT g.id, g.titulo, g.resumen, g.contenido, g.orden, tr.categoria, tr.color_contenedor, tr.nombre AS material
     FROM guia_separacion g
     LEFT JOIN tipos_residuo tr ON tr.id = g.tipo_residuo_id
     WHERE g.publicada = 1 AND (g.titulo LIKE ? OR g.resumen LIKE ? OR g.contenido LIKE ? OR tr.nombre LIKE ?)
     ORDER BY g.orden`,
    [q, q, q, q],
  );
  res.json({ items: rows });
});

router.get('/solicitudes', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const [rows] = await pool.query(
    `SELECT s.id, s.fecha_programada, s.franja, s.estado, s.observaciones,
            GROUP_CONCAT(tr.nombre SEPARATOR ', ') AS materiales
     FROM solicitudes_recoleccion s
     LEFT JOIN solicitud_detalle sd ON sd.solicitud_id = s.id
     LEFT JOIN tipos_residuo tr ON tr.id = sd.tipo_residuo_id
     WHERE s.cliente_id = ?
     GROUP BY s.id
     ORDER BY s.fecha_programada DESC`,
    [ctx.cliente_id],
  );
  const [tipos] = await pool.query(
    'SELECT id, nombre, categoria FROM tipos_residuo WHERE activo = 1 ORDER BY nombre',
  );
  res.json({
    solicitudes: rows.map((s) => ({ ...s, codigo: `SOL-${String(s.id).padStart(4, '0')}` })),
    tipos,
  });
});

router.post('/solicitudes', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const fecha = String(req.body.fecha || '');
  const franja = req.body.franja === 'tarde' ? 'tarde' : 'manana';
  const observaciones = String(req.body.observaciones || '').trim();
  const detalles = Array.isArray(req.body.detalles) ? req.body.detalles : [];
  const b = bogotaNow();
  if (!fecha || fecha < fechaISO(b)) return res.status(400).json({ error: 'La fecha no puede ser pasada' });
  if (!detalles.length) return res.status(400).json({ error: 'Indica al menos un tipo de residuo' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sol] = await conn.query(
      `INSERT INTO solicitudes_recoleccion (cliente_id, direccion_id, fecha_programada, franja, observaciones)
       VALUES (?,?,?,?,?)`,
      [ctx.cliente_id, ctx.direccion_id, fecha, franja, observaciones || null],
    );
    for (const d of detalles) {
      const kg = Number(d.kg);
      if (!d.tipoId || !(kg > 0)) continue;
      await conn.query(
        'INSERT INTO solicitud_detalle (solicitud_id, tipo_residuo_id, cantidad_estimada_kg) VALUES (?,?,?)',
        [sol.insertId, d.tipoId, kg],
      );
    }
    await conn.commit();
    res.status(201).json({ id: sol.insertId, codigo: `SOL-${String(sol.insertId).padStart(4, '0')}` });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.patch('/solicitudes/:id/cancelar', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const [rows] = await pool.query(
    'SELECT id, estado FROM solicitudes_recoleccion WHERE id = ? AND cliente_id = ?',
    [req.params.id, ctx.cliente_id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (!['pendiente', 'programada'].includes(rows[0].estado)) {
    return res.status(400).json({ error: 'Solo puedes cancelar una solicitud pendiente o programada' });
  }
  await pool.query(
    "UPDATE solicitudes_recoleccion SET estado = 'cancelada' WHERE id = ?",
    [req.params.id],
  );
  res.json({ ok: true });
});

router.get('/facturacion', async (req, res) => {
  const ctx = await contexto(req.user.id);
  const [rows] = await pool.query(
    `SELECT f.id, f.numero, f.fecha_emision, f.fecha_vencimiento, f.total, f.estado, p.nombre AS plan,
            COALESCE((SELECT SUM(monto) FROM pagos WHERE factura_id = f.id), 0) AS pagado
     FROM facturas f
     JOIN suscripciones s ON s.id = f.suscripcion_id
     JOIN planes p ON p.id = s.plan_id
     WHERE s.cliente_id = ?
     ORDER BY f.fecha_emision DESC`,
    [ctx.cliente_id],
  );
  res.json({ facturas: rows });
});

router.get('/notificaciones', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, tipo, titulo, mensaje, leida, created_at
     FROM notificaciones WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 40`,
    [req.user.id],
  );
  res.json({ notificaciones: rows });
});

router.patch('/notificaciones/:id/leida', async (req, res) => {
  await pool.query(
    'UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.user.id],
  );
  res.json({ ok: true });
});

router.get('/preferencias', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM preferencias_notificacion WHERE usuario_id = ?',
    [req.user.id],
  );
  res.json({ preferencias: rows[0] || null });
});

router.put('/preferencias', async (req, res) => {
  const minutos = Math.min(240, Math.max(10, Number(req.body.minutosAntes) || 60));
  await pool.query(
    `UPDATE preferencias_notificacion
     SET recordatorio_activo = ?, minutos_antes = ?, alertas_retraso = ?, canal_push = ?
     WHERE usuario_id = ?`,
    [
      req.body.recordatorioActivo ? 1 : 0,
      minutos,
      req.body.alertasRetraso ? 1 : 0,
      req.body.canalPush ? 1 : 0,
      req.user.id,
    ],
  );
  res.json({ ok: true });
});

router.get('/perfil', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.nombres, u.apellidos, u.email, u.telefono, c.numero_documento, d.direccion, z.nombre AS zona
     FROM usuarios u
     LEFT JOIN clientes c ON c.usuario_id = u.id
     LEFT JOIN direcciones d ON d.cliente_id = c.id AND d.es_principal = 1
     LEFT JOIN zonas z ON z.id = d.zona_id
     WHERE u.id = ?`,
    [req.user.id],
  );
  res.json({ perfil: rows[0] });
});

router.put('/perfil', async (req, res) => {
  const nombres = String(req.body.nombres || '').trim();
  const apellidos = String(req.body.apellidos || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  if (!nombres || !apellidos) return res.status(400).json({ error: 'Nombre y apellidos son obligatorios' });
  await pool.query(
    'UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?',
    [nombres, apellidos, telefono || null, req.user.id],
  );
  res.json({ ok: true, nombre: `${nombres} ${apellidos}` });
});

router.post('/dispositivo', async (req, res) => {
  const crypto = require('crypto');
  const token = String(req.body.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Falta el identificador del dispositivo' });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query(
    `INSERT INTO dispositivos_push (usuario_id, plataforma, token_push, token_hash, ultimo_uso)
     VALUES (?, 'web', ?, ?, NOW())
     ON DUPLICATE KEY UPDATE ultimo_uso = NOW(), activo = 1, usuario_id = VALUES(usuario_id)`,
    [req.user.id, token, hash],
  );
  res.json({ ok: true });
});

router.get('/recordatorios', async (req, res) => {
  const [prefRows] = await pool.query(
    'SELECT * FROM preferencias_notificacion WHERE usuario_id = ?',
    [req.user.id],
  );
  const pref = prefRows[0];
  if (!pref || !pref.recordatorio_activo) return res.json({ pendientes: [] });
  const ctx = await contexto(req.user.id);
  const proximo = siguientePaso(await horariosDeZona(ctx?.zona_id));
  const pendientes = [];
  if (proximo && proximo.minutos <= Number(pref.minutos_antes) && proximo.minutos >= 0) {
    pendientes.push({
      tipo: 'recordatorio',
      titulo: 'El camión está por pasar',
      mensaje: proximo.titulo,
    });
  }
  res.json({ pendientes });
});

module.exports = router;
