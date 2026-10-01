const express = require('express');
const { pool } = require('../db');
const { requireAuth, allow } = require('../middleware');
const { auditar, notificar, bogotaNow, formatHora } = require('../helpers');

const router = express.Router();
router.use(requireAuth, allow('administrador_socio', 'gerente_general'));

router.get('/panel', async (req, res) => {
  const b = bogotaNow();
  const [rutas] = await pool.query(
    `SELECT ru.id, ru.nombre, z.nombre AS zona, v.placa, v.estado AS vehiculo_estado, v.capacidad_kg
     FROM rutas ru
     JOIN zonas z ON z.id = ru.zona_id
     LEFT JOIN vehiculos v ON v.id = ru.vehiculo_id
     WHERE ru.activa = 1
     ORDER BY ru.nombre`,
  );
  const progresoBase = Math.min(96, Math.max(18, b.hour * 4));
  const activas = rutas.map((r, i) => {
    const retraso = r.zona === 'San Antonio' || r.zona === 'El Tablazo';
    const completada = r.vehiculo_estado === 'disponible';
    const progreso = completada ? 100 : retraso ? Math.max(30, progresoBase - 25) : Math.min(92, progresoBase + i * 6);
    return {
      ...r,
      progreso,
      estado: completada ? 'completada' : retraso ? 'demora' : 'en_ruta',
    };
  });

  const [quejas] = await pool.query(
    `SELECT q.id, q.descripcion, q.estado, q.created_at, z.nombre AS zona
     FROM quejas_reportes q
     LEFT JOIN zonas z ON z.id = q.zona_id
     WHERE q.estado NOT IN ('resuelto', 'rechazado')
     ORDER BY q.created_at
     LIMIT 8`,
  );
  const [inc] = await pool.query(
    "SELECT COUNT(*) AS n FROM incidencias WHERE estado = 'activa' AND tipo = 'trafico'",
  );
  const [kg] = await pool.query(
    `SELECT COALESCE(SUM(rd.peso_kg), 0) AS kg
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id
     WHERE r.estado = 'finalizada' AND DATE(r.fecha_hora_fin) = CURDATE()`,
  );
  const [veh] = await pool.query(
    "SELECT COUNT(*) AS total, SUM(estado = 'en_ruta') AS en_ruta FROM vehiculos WHERE estado <> 'inactivo'",
  );

  res.json({
    fecha: `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`,
    hora: `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`,
    rutasEnCurso: activas.filter((r) => r.estado !== 'completada').length,
    rutasTotal: activas.length,
    quejasAbiertas: quejas.length,
    materialKg: Number(kg[0].kg),
    alertasTrafico: Number(inc[0].n),
    dispositivos: Number(veh[0].total || 0),
    enLinea: Number(veh[0].en_ruta || 0),
    rutas: activas,
    quejas: quejas.map((q) => ({ ...q, codigo: `#${q.id}` })),
    flota: activas.map((r) => ({ nombre: r.nombre, placa: r.placa, progreso: r.progreso })),
  });
});

router.get('/rutas', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT ru.id, ru.nombre, ru.activa, z.nombre AS zona, z.id AS zona_id, v.placa, v.id AS vehiculo_id,
            h.dia_semana, h.hora_paso, h.tipo_recoleccion, h.activo AS horario_activo, h.id AS horario_id
     FROM rutas ru
     JOIN zonas z ON z.id = ru.zona_id
     LEFT JOIN vehiculos v ON v.id = ru.vehiculo_id
     LEFT JOIN horarios_ruta h ON h.ruta_id = ru.id
     ORDER BY ru.nombre, h.dia_semana, h.hora_paso`,
  );
  res.json({ horarios: rows.map((r) => ({ ...r, hora: r.hora_paso ? formatHora(r.hora_paso) : null })) });
});

router.get('/catalogos', async (_req, res) => {
  const [zonas] = await pool.query('SELECT id, nombre, municipio, es_piloto FROM zonas WHERE activa = 1 ORDER BY nombre');
  const [vehiculos] = await pool.query('SELECT id, placa, tipo, capacidad_kg, estado FROM vehiculos ORDER BY placa');
  res.json({ zonas, vehiculos });
});

router.post('/incidencias', async (req, res) => {
  const zonaId = Number(req.body.zonaId);
  const tipo = req.body.tipo;
  const descripcion = String(req.body.descripcion || '').trim();
  const permitidos = ['trafico', 'averia', 'clima', 'otro'];
  if (!zonaId || !permitidos.includes(tipo) || descripcion.length < 8) {
    return res.status(400).json({ error: 'Completa zona, tipo y una descripción clara' });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO incidencias (zona_id, ruta_id, tipo, descripcion, retraso_minutos, nueva_hora_estimada, creada_por)
       VALUES (?,?,?,?,?,?,?)`,
      [
        zonaId,
        req.body.rutaId || null,
        tipo,
        descripcion,
        req.body.retrasoMinutos || null,
        req.body.nuevaHora || null,
        req.user.id,
      ],
    );
    const [clientes] = await conn.query(
      `SELECT DISTINCT u.id FROM usuarios u
       JOIN clientes c ON c.usuario_id = u.id
       JOIN direcciones d ON d.cliente_id = c.id
       JOIN preferencias_notificacion p ON p.usuario_id = u.id AND p.alertas_retraso = 1
       WHERE d.zona_id = ?`,
      [zonaId],
    );
    for (const c of clientes) {
      await notificar(conn, {
        usuarioId: c.id,
        tipo: 'retraso',
        titulo: 'Retraso en tu zona',
        mensaje: descripcion,
        referenciaTipo: 'incidencia',
        referenciaId: result.insertId,
      });
    }
    await auditar(conn, {
      usuarioId: req.user.id,
      accion: 'publicar_incidencia',
      entidad: 'incidencias',
      entidadId: result.insertId,
      detalle: { tipo, zonaId },
      ip: req.ip,
    });
    res.status(201).json({ id: result.insertId, avisados: clientes.length });
  } finally {
    conn.release();
  }
});

router.patch('/incidencias/:id/resolver', async (req, res) => {
  const [rows] = await pool.query('SELECT id, zona_id, descripcion FROM incidencias WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Incidencia no encontrada' });
  await pool.query(
    "UPDATE incidencias SET estado = 'resuelta', resuelta_at = NOW() WHERE id = ?",
    [req.params.id],
  );
  const [clientes] = await pool.query(
    `SELECT DISTINCT u.id FROM usuarios u
     JOIN clientes c ON c.usuario_id = u.id
     JOIN direcciones d ON d.cliente_id = c.id
     WHERE d.zona_id = ?`,
    [rows[0].zona_id],
  );
  for (const c of clientes) {
    await notificar(pool, {
      usuarioId: c.id,
      tipo: 'retraso',
      titulo: 'El retraso quedó resuelto',
      mensaje: rows[0].descripcion,
      referenciaTipo: 'incidencia',
      referenciaId: rows[0].id,
    });
  }
  res.json({ ok: true });
});

router.get('/quejas', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT q.*, z.nombre AS zona, u.nombres, u.apellidos,
            (SELECT url FROM queja_evidencias e WHERE e.queja_id = q.id LIMIT 1) AS foto
     FROM quejas_reportes q
     LEFT JOIN zonas z ON z.id = q.zona_id
     JOIN clientes c ON c.id = q.cliente_id
     JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY FIELD(q.estado, 'recibido', 'en_revision', 'en_atencion', 'resuelto', 'rechazado'), q.created_at DESC`,
  );
  res.json({ quejas: rows });
});

router.patch('/quejas/:id', async (req, res) => {
  const estados = ['recibido', 'en_revision', 'en_atencion', 'resuelto', 'rechazado'];
  if (!estados.includes(req.body.estado)) return res.status(400).json({ error: 'Estado no válido' });
  const respuesta = String(req.body.respuesta || '').trim();
  const [rows] = await pool.query(
    `SELECT q.id, u.id AS usuario_id FROM quejas_reportes q
     JOIN clientes c ON c.id = q.cliente_id JOIN usuarios u ON u.id = c.usuario_id
     WHERE q.id = ?`,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Queja no encontrada' });
  await pool.query(
    `UPDATE quejas_reportes
     SET estado = ?, respuesta = ?, atendido_por = ?, resuelto_at = IF(? = 'resuelto', NOW(), resuelto_at)
     WHERE id = ?`,
    [req.body.estado, respuesta || null, req.user.id, req.body.estado, req.params.id],
  );
  await notificar(pool, {
    usuarioId: rows[0].usuario_id,
    tipo: 'respuesta_queja',
    titulo: 'Tu reporte cambió de estado',
    mensaje: respuesta || `Ahora está en ${req.body.estado.replaceAll('_', ' ')}`,
    referenciaTipo: 'queja',
    referenciaId: Number(req.params.id),
  });
  await auditar(pool, {
    usuarioId: req.user.id,
    accion: 'atender_queja',
    entidad: 'quejas_reportes',
    entidadId: Number(req.params.id),
    detalle: { estado: req.body.estado },
    ip: req.ip,
  });
  res.json({ ok: true });
});

router.post('/rutas', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const zonaId = Number(req.body.zonaId);
  if (!nombre || !zonaId) return res.status(400).json({ error: 'Nombre y zona son obligatorios' });
  const [result] = await pool.query(
    'INSERT INTO rutas (zona_id, vehiculo_id, nombre, activa) VALUES (?,?,?,1)',
    [zonaId, req.body.vehiculoId || null, nombre],
  );
  await auditar(pool, {
    usuarioId: req.user.id,
    accion: 'crear_ruta',
    entidad: 'rutas',
    entidadId: result.insertId,
    ip: req.ip,
  });
  res.status(201).json({ id: result.insertId });
});

router.post('/horarios', async (req, res) => {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const tipos = ['ordinaria', 'reciclable', 'organica'];
  if (!req.body.rutaId || !dias.includes(req.body.dia) || !tipos.includes(req.body.tipo) || !req.body.hora) {
    return res.status(400).json({ error: 'Revisa día, hora, tipo y ruta' });
  }
  await pool.query(
    `INSERT INTO horarios_ruta (ruta_id, dia_semana, hora_paso, tipo_recoleccion, activo)
     VALUES (?,?,?,?,1)`,
    [req.body.rutaId, req.body.dia, req.body.hora, req.body.tipo],
  );
  res.status(201).json({ ok: true });
});

module.exports = router;
