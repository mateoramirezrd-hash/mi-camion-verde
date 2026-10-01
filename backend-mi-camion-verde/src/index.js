const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pool } = require('./db');
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const operacionRoutes = require('./routes/operacion');
const { gerencia, comercial } = require('./routes/gerencia');

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/salud', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, servicio: 'Mi Camión Verde' });
});

app.get('/api/zonas', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, municipio, es_piloto FROM zonas WHERE activa = 1 ORDER BY es_piloto DESC, nombre',
  );
  res.json({ zonas: rows });
});

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', loginLimit);
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/operacion', operacionRoutes);
app.use('/api/gerencia', gerencia);
app.use('/api/comercial', comercial);

app.use((err, _req, res, _next) => {
  console.error(err);
  const red = `${err.code || ''} ${err.message || ''}`;
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ECONNRESET/.test(red)) {
    return res.status(503).json({
      error: 'No hay conexión con MySQL en Clever Cloud. Este equipo no alcanza el puerto 3306.',
    });
  }
  res.status(500).json({ error: 'No pudimos completar la acción. Inténtalo de nuevo.' });
});

app.listen(port, () => {
  console.log(`API de Mi Camión Verde en http://localhost:${port}`);
});
