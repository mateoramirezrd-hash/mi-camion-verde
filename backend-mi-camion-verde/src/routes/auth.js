const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { signUser } = require('../middleware');
const { auditar } = require('../helpers');

const router = express.Router();

function limpiar(valor) {
  return String(valor || '').trim();
}

router.post('/registro', async (req, res) => {
  const nombres = limpiar(req.body.nombres);
  const apellidos = limpiar(req.body.apellidos);
  const email = limpiar(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const telefono = limpiar(req.body.telefono);
  const documento = limpiar(req.body.documento);
  const direccion = limpiar(req.body.direccion);
  const zonaId = Number(req.body.zonaId);

  if (!nombres || !apellidos || !email || !password || !documento || !direccion || !zonaId) {
    return res.status(400).json({ error: 'Completa todos los campos obligatorios' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [roles] = await conn.query("SELECT id FROM roles WHERE nombre = 'cliente' LIMIT 1");
    if (!roles.length) throw new Error('Falta el rol cliente');
    const [zonas] = await conn.query('SELECT id FROM zonas WHERE id = ? AND activa = 1', [zonaId]);
    if (!zonas.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Selecciona una zona válida' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [user] = await conn.query(
      `INSERT INTO usuarios (rol_id, nombres, apellidos, email, password_hash, telefono)
       VALUES (?,?,?,?,?,?)`,
      [roles[0].id, nombres, apellidos, email, hash, telefono || null],
    );
    const [cliente] = await conn.query(
      `INSERT INTO clientes (usuario_id, tipo_cliente, tipo_documento, numero_documento)
       VALUES (?, 'hogar', 'CC', ?)`,
      [user.insertId, documento],
    );
    await conn.query(
      `INSERT INTO direcciones (cliente_id, zona_id, alias, direccion, es_principal)
       VALUES (?, ?, 'Principal', ?, 1)`,
      [cliente.insertId, zonaId, direccion],
    );
    await conn.query(
      'INSERT INTO preferencias_notificacion (usuario_id) VALUES (?)',
      [user.insertId],
    );
    await auditar(conn, {
      usuarioId: user.insertId,
      accion: 'registro',
      entidad: 'usuarios',
      entidadId: user.insertId,
      ip: req.ip,
    });
    await conn.commit();
    const token = signUser({
      id: user.insertId,
      rol: 'cliente',
      email,
      nombres,
      apellidos,
    });
    res.status(201).json({
      token,
      usuario: { id: user.insertId, rol: 'cliente', email, nombre: `${nombres} ${apellidos}` },
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese correo o documento ya está registrado' });
    }
    throw err;
  } finally {
    conn.release();
  }
});

router.post('/login', async (req, res) => {
  const email = limpiar(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Escribe correo y contraseña' });

  const [rows] = await pool.query(
    `SELECT u.id, u.nombres, u.apellidos, u.email, u.password_hash, u.estado, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.email = ? LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  if (user.estado === 'bloqueado') {
    return res.status(403).json({ error: 'Esta cuenta está bloqueada. Escribe a la gerencia.' });
  }
  if (user.estado === 'inactivo') {
    return res.status(403).json({ error: 'Esta cuenta está inactiva' });
  }
  await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);
  const token = signUser(user);
  res.json({
    token,
    usuario: {
      id: user.id,
      rol: user.rol,
      email: user.email,
      nombre: `${user.nombres} ${user.apellidos}`,
    },
  });
});

module.exports = router;
