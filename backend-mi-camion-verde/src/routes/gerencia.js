const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, allow } = require('../middleware');
const { auditar, co2e, arboles } = require('../helpers');

const gerencia = express.Router();
gerencia.use(requireAuth, allow('gerente_general'));

gerencia.get('/panel', async (_req, res) => {
  const [mensual] = await pool.query(
    `SELECT DATE_FORMAT(r.fecha_hora_fin, '%Y-%m') AS mes,
            ROUND(SUM(CASE WHEN tr.categoria IN ('reciclable','organico') THEN rd.peso_kg ELSE 0 END), 1) AS kg
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id AND r.estado = 'finalizada'
     JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id
     GROUP BY mes
     ORDER BY mes`,
  );
  const [totales] = await pool.query(
    `SELECT
        ROUND(SUM(CASE WHEN tr.categoria IN ('reciclable','organico') THEN rd.peso_kg ELSE 0 END), 1) AS recuperado,
        COUNT(DISTINCT s.cliente_id) AS clientes
     FROM recoleccion_detalle rd
     JOIN recolecciones r ON r.id = rd.recoleccion_id AND r.estado = 'finalizada'
     JOIN solicitudes_recoleccion s ON s.id = r.solicitud_id
     JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id`,
  );
  const [hogares] = await pool.query("SELECT COUNT(*) AS n FROM clientes");
  const [inc] = await pool.query("SELECT COUNT(*) AS n FROM incidencias WHERE estado = 'activa'");
  const [quejas] = await pool.query("SELECT COUNT(*) AS n FROM quejas_reportes WHERE estado NOT IN ('resuelto','rechazado')");
  const [ingresos] = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) AS total,
            COALESCE(SUM(CASE WHEN fecha_pago >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN monto ELSE 0 END), 0) AS mes
     FROM pagos`,
  );
  const [cartera] = await pool.query(
    `SELECT COALESCE(SUM(f.total), 0) AS facturado,
            COALESCE(SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END), 0) AS pendiente
     FROM facturas f`,
  );
  const [zonas] = await pool.query(
    `SELECT z.id, z.nombre, z.es_piloto,
            COUNT(DISTINCT d.cliente_id) AS hogares,
            COALESCE(SUM(CASE WHEN tr.categoria IN ('reciclable','organico') THEN rd.peso_kg ELSE 0 END), 0) AS kg
     FROM zonas z
     LEFT JOIN direcciones d ON d.zona_id = z.id
     LEFT JOIN solicitudes_recoleccion s ON s.direccion_id = d.id
     LEFT JOIN recolecciones r ON r.solicitud_id = s.id AND r.estado = 'finalizada'
     LEFT JOIN recoleccion_detalle rd ON rd.recoleccion_id = r.id
     LEFT JOIN tipos_residuo tr ON tr.id = rd.tipo_residuo_id
     GROUP BY z.id
     ORDER BY kg DESC, z.nombre`,
  );
  const recuperado = Number(totales[0].recuperado || 0);
  const facturado = Number(cartera[0].facturado || 0);
  const pendiente = Number(cartera[0].pendiente || 0);
  res.json({
    serie: mensual,
    recuperadoKg: recuperado,
    co2Kg: co2e(recuperado),
    arboles: arboles(recuperado),
    hogares: Number(hogares[0].n),
    incidencias: Number(inc[0].n),
    quejas: Number(quejas[0].n),
    ingresos: Number(ingresos[0].total),
    ingresosMes: Number(ingresos[0].mes),
    cartera: facturado > 0 ? Math.round((pendiente / facturado) * 1000) / 10 : 0,
    zonas,
    empleos: 4,
  });
});

gerencia.get('/reporte.csv', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM v_residuos_por_zona_mes ORDER BY mes, zona');
  const header = 'zona,mes,categoria,total_kg';
  const body = rows.map((r) => `${r.zona},${r.mes},${r.categoria},${r.total_kg}`).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="residuos-por-zona.csv"');
  res.send(`${header}\n${body}\n`);
});

gerencia.get('/usuarios', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nombres, u.apellidos, u.email, u.telefono, u.estado, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     ORDER BY u.created_at DESC`,
  );
  res.json({ usuarios: rows });
});

gerencia.post('/usuarios', async (req, res) => {
  const rolesPermitidos = ['gerente_general', 'directora_admin_comercial', 'administrador_socio'];
  const nombres = String(req.body.nombres || '').trim();
  const apellidos = String(req.body.apellidos || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!nombres || !apellidos || !email || password.length < 8 || !rolesPermitidos.includes(req.body.rol)) {
    return res.status(400).json({ error: 'Revisa nombre, correo, rol y una contraseña de 8 caracteres' });
  }
  const [roles] = await pool.query('SELECT id FROM roles WHERE nombre = ?', [req.body.rol]);
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      `INSERT INTO usuarios (rol_id, nombres, apellidos, email, password_hash, telefono)
       VALUES (?,?,?,?,?,?)`,
      [roles[0].id, nombres, apellidos, email, hash, req.body.telefono || null],
    );
    await pool.query('INSERT INTO preferencias_notificacion (usuario_id) VALUES (?)', [result.insertId]);
    await auditar(pool, {
      usuarioId: req.user.id,
      accion: 'crear_usuario',
      entidad: 'usuarios',
      entidadId: result.insertId,
      detalle: { rol: req.body.rol },
      ip: req.ip,
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese correo ya existe' });
    throw err;
  }
});

gerencia.patch('/usuarios/:id', async (req, res) => {
  const estados = ['activo', 'inactivo', 'bloqueado'];
  if (req.body.estado && !estados.includes(req.body.estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  if (req.body.estado) {
    await pool.query('UPDATE usuarios SET estado = ? WHERE id = ?', [req.body.estado, req.params.id]);
  }
  if (req.body.rol) {
    const [roles] = await pool.query('SELECT id FROM roles WHERE nombre = ?', [req.body.rol]);
    if (!roles.length) return res.status(400).json({ error: 'Rol no válido' });
    await pool.query('UPDATE usuarios SET rol_id = ? WHERE id = ?', [roles[0].id, req.params.id]);
  }
  await auditar(pool, {
    usuarioId: req.user.id,
    accion: 'editar_usuario',
    entidad: 'usuarios',
    entidadId: Number(req.params.id),
    detalle: req.body,
    ip: req.ip,
  });
  res.json({ ok: true });
});

gerencia.get('/auditoria', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle, a.created_at,
            CONCAT(u.nombres, ' ', u.apellidos) AS usuario
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ORDER BY a.created_at DESC
     LIMIT 80`,
  );
  res.json({ eventos: rows });
});

const comercial = express.Router();
comercial.use(requireAuth, allow('directora_admin_comercial', 'gerente_general', 'administrador_socio'));

comercial.get('/panel', async (_req, res) => {
  const [planes] = await pool.query('SELECT * FROM planes ORDER BY precio DESC');
  const [suscripciones] = await pool.query(
    `SELECT s.id, s.estado, s.fecha_inicio, s.fecha_fin, p.nombre AS plan, p.precio,
            CONCAT(u.nombres, ' ', u.apellidos) AS cliente, u.email
     FROM suscripciones s
     JOIN planes p ON p.id = s.plan_id
     JOIN clientes c ON c.id = s.cliente_id
     JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY s.created_at DESC`,
  );
  const [facturas] = await pool.query(
    `SELECT f.id, f.numero, f.total, f.estado, f.fecha_vencimiento, p.nombre AS plan,
            CONCAT(u.nombres, ' ', u.apellidos) AS cliente,
            COALESCE((SELECT SUM(monto) FROM pagos WHERE factura_id = f.id), 0) AS pagado
     FROM facturas f
     JOIN suscripciones s ON s.id = f.suscripcion_id
     JOIN planes p ON p.id = s.plan_id
     JOIN clientes c ON c.id = s.cliente_id
     JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY f.fecha_emision DESC`,
  );
  const [clientes] = await pool.query(
    `SELECT c.id, CONCAT(u.nombres, ' ', u.apellidos) AS nombre, u.email
     FROM clientes c JOIN usuarios u ON u.id = c.usuario_id ORDER BY u.nombres`,
  );
  res.json({ planes, suscripciones, facturas, clientes });
});

comercial.post('/planes', async (req, res) => {
  const frecuencias = ['semanal', 'quincenal', 'mensual', 'demanda'];
  const nombre = String(req.body.nombre || '').trim();
  const precio = Number(req.body.precio);
  if (!nombre || !frecuencias.includes(req.body.frecuencia) || !(precio >= 0)) {
    return res.status(400).json({ error: 'Revisa nombre, frecuencia y precio' });
  }
  const [result] = await pool.query(
    'INSERT INTO planes (nombre, descripcion, frecuencia, precio, activo) VALUES (?,?,?,?,1)',
    [nombre, req.body.descripcion || null, req.body.frecuencia, precio],
  );
  await auditar(pool, {
    usuarioId: req.user.id, accion: 'crear_plan', entidad: 'planes', entidadId: result.insertId, ip: req.ip,
  });
  res.status(201).json({ id: result.insertId });
});

comercial.patch('/planes/:id', async (req, res) => {
  await pool.query('UPDATE planes SET activo = ? WHERE id = ?', [req.body.activo ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

comercial.post('/suscripciones', async (req, res) => {
  const [result] = await pool.query(
    `INSERT INTO suscripciones (cliente_id, plan_id, creada_por, fecha_inicio, estado)
     VALUES (?,?,?, CURDATE(), 'activa')`,
    [req.body.clienteId, req.body.planId, req.user.id],
  );
  res.status(201).json({ id: result.insertId });
});

comercial.patch('/suscripciones/:id', async (req, res) => {
  const estados = ['activa', 'pausada', 'cancelada', 'vencida'];
  if (!estados.includes(req.body.estado)) return res.status(400).json({ error: 'Estado no válido' });
  await pool.query(
    'UPDATE suscripciones SET estado = ?, fecha_fin = IF(? IN (\'cancelada\',\'vencida\'), CURDATE(), fecha_fin) WHERE id = ?',
    [req.body.estado, req.body.estado, req.params.id],
  );
  res.json({ ok: true });
});

comercial.post('/facturas', async (req, res) => {
  const [sus] = await pool.query(
    `SELECT s.id, p.precio FROM suscripciones s JOIN planes p ON p.id = s.plan_id WHERE s.id = ?`,
    [req.body.suscripcionId],
  );
  if (!sus.length) return res.status(404).json({ error: 'Suscripción no encontrada' });
  const total = Number(sus[0].precio);
  const numero = `MCV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const [result] = await pool.query(
    `INSERT INTO facturas (suscripcion_id, numero, fecha_emision, fecha_vencimiento, subtotal, impuestos, total, estado)
     VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, 0, ?, 'pendiente')`,
    [sus[0].id, numero, total, total],
  );
  res.status(201).json({ id: result.insertId, numero });
});

comercial.post('/pagos', async (req, res) => {
  const metodos = ['efectivo', 'transferencia', 'tarjeta', 'pse'];
  const monto = Number(req.body.monto);
  if (!metodos.includes(req.body.metodo) || !(monto > 0)) {
    return res.status(400).json({ error: 'Revisa el monto y el método de pago' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [fac] = await conn.query('SELECT id, total, estado FROM facturas WHERE id = ? FOR UPDATE', [req.body.facturaId]);
    if (!fac.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    await conn.query(
      `INSERT INTO pagos (factura_id, monto, metodo, referencia, registrado_por) VALUES (?,?,?,?,?)`,
      [req.body.facturaId, monto, req.body.metodo, req.body.referencia || null, req.user.id],
    );
    const [sum] = await conn.query('SELECT COALESCE(SUM(monto),0) AS pagado FROM pagos WHERE factura_id = ?', [req.body.facturaId]);
    if (Number(sum[0].pagado) >= Number(fac[0].total)) {
      await conn.query("UPDATE facturas SET estado = 'pagada' WHERE id = ?", [req.body.facturaId]);
    }
    await auditar(conn, {
      usuarioId: req.user.id,
      accion: 'registrar_pago',
      entidad: 'facturas',
      entidadId: Number(req.body.facturaId),
      detalle: { monto },
      ip: req.ip,
    });
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = { gerencia, comercial };
