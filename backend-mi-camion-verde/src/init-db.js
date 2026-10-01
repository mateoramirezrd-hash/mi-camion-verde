const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const DEMO_PASSWORD = 'Verde2026!';

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows.length > 0;
}

async function applySchema(conn) {
  const [tables] = await conn.query("SHOW TABLES LIKE 'roles'");
  if (tables.length) {
    console.log('El esquema ya existe. Se omite la creación de tablas.');
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'schema.sql'), 'utf8');
  await conn.query(sql);
  console.log('Esquema creado.');
}

async function seed(conn) {
  const [found] = await conn.query(
    "SELECT id FROM usuarios WHERE email = 'cliente@micamionverde.co' LIMIT 1",
  );
  if (found.length) {
    console.log('Los datos de demostración ya están cargados.');
    return;
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [roles] = await conn.query('SELECT id, nombre FROM roles');
  const rol = Object.fromEntries(roles.map((r) => [r.nombre, r.id]));

  const usuarios = [
    ['Carlos', 'Mejia', 'gerente@micamionverde.co', rol.gerente_general, '3100000001'],
    ['Mariana', 'Ospina', 'comercial@micamionverde.co', rol.directora_admin_comercial, '3100000002'],
    ['Laura', 'Gómez', 'admin@micamionverde.co', rol.administrador_socio, '3100000003'],
    ['Ana', 'Restrepo', 'cliente@micamionverde.co', rol.cliente, '3105550199'],
  ];

  const ids = {};
  for (const [nombres, apellidos, email, rolId, telefono] of usuarios) {
    const [res] = await conn.query(
      `INSERT INTO usuarios (rol_id, nombres, apellidos, email, password_hash, telefono, estado)
       VALUES (?,?,?,?,?,?, 'activo')`,
      [rolId, nombres, apellidos, email, hash, telefono],
    );
    ids[email] = res.insertId;
    await conn.query(
      `INSERT INTO preferencias_notificacion (usuario_id, recordatorio_activo, minutos_antes, alertas_retraso)
       VALUES (?, 1, 60, 1)`,
      [res.insertId],
    );
  }

  const zonasSeed = [
    ['El Porvenir', 1],
    ['La Primavera', 0],
    ['San Antonio', 0],
    ['El Tablazo', 0],
    ['Centro', 0],
    ['Alto Bonito', 0],
  ];
  const zona = {};
  for (const [nombre, piloto] of zonasSeed) {
    const [res] = await conn.query(
      'INSERT INTO zonas (nombre, municipio, es_piloto, activa) VALUES (?, ?, ?, 1)',
      [nombre, 'Rionegro', piloto],
    );
    zona[nombre] = res.insertId;
  }

  const [cliente] = await conn.query(
    `INSERT INTO clientes (usuario_id, tipo_cliente, tipo_documento, numero_documento, nombre_comercial)
     VALUES (?, 'hogar', 'CC', '1030000001', 'Unidad Residencial El Porvenir')`,
    [ids['cliente@micamionverde.co']],
  );

  await conn.query(
    `INSERT INTO direcciones (cliente_id, zona_id, alias, direccion, referencia, latitud, longitud, es_principal)
     VALUES (?, ?, 'Principal', 'Calle 37 # 52-18', 'Unidad El Porvenir, portería principal', 6.155419, -75.373612, 1)`,
    [cliente.insertId, zona['El Porvenir']],
  );
  const [dirRows] = await conn.query(
    'SELECT id FROM direcciones WHERE cliente_id = ? AND es_principal = 1',
    [cliente.insertId],
  );
  const direccionId = dirRows[0].id;

  const vehiculos = [
    ['MCV103', 'Compactador', 4500, 'en_ruta'],
    ['MCV207', 'Compactador', 4500, 'en_ruta'],
    ['MCV311', 'Compactador', 5000, 'disponible'],
  ];
  const vehiculo = {};
  for (const [placa, tipo, cap, estado] of vehiculos) {
    const [res] = await conn.query(
      'INSERT INTO vehiculos (placa, tipo, capacidad_kg, estado) VALUES (?,?,?,?)',
      [placa, tipo, cap, estado],
    );
    vehiculo[placa] = res.insertId;
  }

  async function crearRuta(nombre, zonaId, vehiculoId, horarios) {
    const [res] = await conn.query(
      'INSERT INTO rutas (zona_id, vehiculo_id, nombre, activa) VALUES (?,?,?,1)',
      [zonaId, vehiculoId, nombre],
    );
    for (const [dia, hora, tipo] of horarios) {
      await conn.query(
        'INSERT INTO horarios_ruta (ruta_id, dia_semana, hora_paso, tipo_recoleccion, activo) VALUES (?,?,?,?,1)',
        [res.insertId, dia, hora, tipo],
      );
    }
    return res.insertId;
  }

  const ruta03 = await crearRuta('Ruta 03 · La Primavera', zona['El Porvenir'], vehiculo.MCV103, [
    ['jueves', '10:10:00', 'reciclable'],
    ['jueves', '14:30:00', 'ordinaria'],
    ['lunes', '07:30:00', 'organica'],
  ]);
  await crearRuta('Ruta 07 · San Antonio', zona['San Antonio'], vehiculo.MCV207, [
    ['jueves', '11:20:00', 'ordinaria'],
    ['martes', '08:00:00', 'reciclable'],
  ]);
  await crearRuta('Ruta 11 · Centro', zona['Centro'], vehiculo.MCV311, [
    ['miercoles', '09:00:00', 'reciclable'],
    ['viernes', '15:00:00', 'ordinaria'],
  ]);

  await conn.query(
    `INSERT INTO incidencias (zona_id, ruta_id, tipo, descripcion, retraso_minutos, nueva_hora_estimada, estado, creada_por)
     VALUES (?, NULL, 'trafico', 'Corte por obra en la vía principal de San Antonio', 35, '11:55:00', 'activa', ?),
            (?, NULL, 'trafico', 'Congestión en la salida hacia El Tablazo', 20, '12:10:00', 'activa', ?)`,
    [zona['San Antonio'], ids['admin@micamionverde.co'], zona['El Tablazo'], ids['admin@micamionverde.co']],
  );

  await conn.query(
    `INSERT INTO quejas_reportes
      (id, cliente_id, zona_id, tipo, descripcion, latitud, longitud, referencia_ubicacion, estado, respuesta, atendido_por, created_at, updated_at)
     VALUES
      (184, ?, ?, 'falla_servicio', 'Bolsa no recogida', 6.1554, -75.3736, 'Calle 37 # 52-18', 'en_revision', NULL, ?, DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW()),
      (181, ?, ?, 'acumulacion_residuos', 'Punto crítico con escombros', 6.1490, -75.3680, 'Carrera 50, esquina del parque', 'en_atencion', 'Cuadrilla asignada para hoy.', ?, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),
      (179, ?, ?, 'contenedor_danado', 'Contenedor lleno', 6.1562, -75.3710, 'Unidad El Porvenir, torre 4', 'recibido', NULL, NULL, '2026-09-30 09:00:00', '2026-09-30 09:00:00')`,
    [
      cliente.insertId, zona['El Porvenir'], ids['admin@micamionverde.co'],
      cliente.insertId, zona['La Primavera'], ids['admin@micamionverde.co'],
      cliente.insertId, zona['El Porvenir'],
    ],
  );

  await conn.query(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, referencia_tipo, referencia_id, leida)
     VALUES (?, 'sistema', 'Vidrio en caja segura', 'Vidrio: entrégalo en caja segura', 'guia', NULL, 0)`,
    [ids['cliente@micamionverde.co']],
  );

  const [tipos] = await conn.query('SELECT id, nombre, categoria FROM tipos_residuo');
  const tipo = Object.fromEntries(tipos.map((t) => [t.nombre, t]));

  await conn.query('DELETE FROM guia_separacion');
  const guias = [
    [tipo['Papel y cartón'].id, 'Papel y cartón', 'Cajas limpias, cuadernos, periódicos', 'Deben estar limpios y secos. Quita cintas y grasa. El papel higiénico no va aquí.', 1],
    [tipo.Plástico.id, 'Plásticos', 'Botellas PET, tapas y envases lavados', 'Enjuaga y aplasta las botellas. Las bolsas van limpias y secas.', 2],
    [tipo.Vidrio.id, 'Vidrio y metales', 'Frascos, latas y aluminio', 'Entrégalo en una caja segura. Las latas se enjuagan y se aplastan.', 3],
    [tipo['Residuos de alimentos'].id, 'Orgánicos', 'Restos de comida y poda', 'Cáscaras, sobras y hojas. Escúrrelos y no los mezcles con plástico.', 4],
  ];
  for (const g of guias) {
    await conn.query(
      `INSERT INTO guia_separacion (tipo_residuo_id, titulo, resumen, contenido, orden, publicada)
       VALUES (?,?,?,?,?,1)`,
      g,
    );
  }

  const meses = [
    ['2026-03-12 10:30:00', 58],
    ['2026-04-09 10:30:00', 72],
    ['2026-05-14 10:30:00', 68],
    ['2026-06-11 10:30:00', 86],
    ['2026-07-09 10:30:00', 96],
    ['2026-08-13 10:30:00', 112],
    ['2026-09-10 10:30:00', 125],
    ['2026-10-01 09:40:00', 68.4],
  ];

  for (const [fin, kg] of meses) {
    const fecha = fin.slice(0, 10);
    const [sol] = await conn.query(
      `INSERT INTO solicitudes_recoleccion
        (cliente_id, direccion_id, ruta_id, fecha_programada, franja, estado, observaciones)
       VALUES (?, ?, ?, ?, 'manana', 'completada', 'Recolección ordinaria de ruta')`,
      [cliente.insertId, direccionId, ruta03, fecha],
    );
    const [rec] = await conn.query(
      `INSERT INTO recolecciones
        (solicitud_id, vehiculo_id, registrado_por, fecha_hora_inicio, fecha_hora_fin, estado)
       VALUES (?, ?, ?, ?, ?, 'finalizada')`,
      [sol.insertId, vehiculo.MCV103, ids['admin@micamionverde.co'], fin, fin],
    );
    const reciclable = Number(kg);
    const ordinario = Number((reciclable * 0.19).toFixed(2));
    await conn.query(
      `INSERT INTO recoleccion_detalle (recoleccion_id, tipo_residuo_id, peso_kg) VALUES (?,?,?), (?,?,?)`,
      [rec.insertId, tipo.Plástico.id, reciclable, rec.insertId, tipo['Residuos ordinarios'].id, ordinario],
    );
  }

  await conn.query(
    `INSERT INTO solicitudes_recoleccion
      (id, cliente_id, direccion_id, ruta_id, fecha_programada, franja, estado, observaciones)
     VALUES (284, ?, ?, ?, '2026-10-03', 'manana', 'programada', 'Recogida de sofá y mesa')`,
    [cliente.insertId, direccionId, ruta03],
  );
  await conn.query(
    `INSERT INTO solicitudes_recoleccion
      (cliente_id, direccion_id, fecha_programada, franja, estado, observaciones)
     VALUES (?, ?, '2026-10-18', 'tarde', 'pendiente', 'Jornada de poda en zona común')`,
    [cliente.insertId, direccionId],
  );
  if (tipo['Residuos de poda y jardín']) {
    const [solPod] = await conn.query(
      "SELECT id FROM solicitudes_recoleccion WHERE observaciones = 'Jornada de poda en zona común' LIMIT 1",
    );
    await conn.query(
      'INSERT INTO solicitud_detalle (solicitud_id, tipo_residuo_id, cantidad_estimada_kg) VALUES (?,?,?)',
      [solPod[0].id, tipo['Residuos de poda y jardín'].id, 40],
    );
  }
  await conn.query(
    'INSERT INTO solicitud_detalle (solicitud_id, tipo_residuo_id, cantidad_estimada_kg) VALUES (284, ?, 35)',
    [tipo['Residuos ordinarios'].id],
  );

  const [plan] = await conn.query(
    `INSERT INTO planes (nombre, descripcion, frecuencia, precio, activo)
     VALUES ('Plan Comunidad', 'Dos recogidas especiales al mes para la unidad', 'mensual', 12900, 1)`,
  );
  const [sus] = await conn.query(
    `INSERT INTO suscripciones (cliente_id, plan_id, creada_por, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, '2026-09-15', NULL, 'activa')`,
    [cliente.insertId, plan.insertId, ids['comercial@micamionverde.co']],
  );
  const [fac] = await conn.query(
    `INSERT INTO facturas
      (suscripcion_id, numero, fecha_emision, fecha_vencimiento, subtotal, impuestos, total, estado)
     VALUES (?, 'MCV-2026-1008', '2026-09-15', '2026-10-15', 12900, 0, 12900, 'pagada')`,
    [sus.insertId],
  );
  await conn.query(
    `INSERT INTO pagos (factura_id, monto, metodo, referencia, fecha_pago, registrado_por)
     VALUES (?, 12900, 'transferencia', 'DEB-1008', '2026-09-16 08:30:00', ?)`,
    [fac.insertId, ids['comercial@micamionverde.co']],
  );

  console.log('Datos de demostración listos.');
  console.log('Cliente:    cliente@micamionverde.co');
  console.log('Operación:  admin@micamionverde.co');
  console.log('Comercial:  comercial@micamionverde.co');
  console.log('Gerencia:   gerente@micamionverde.co');
  console.log(`Contraseña de las cuatro cuentas: ${DEMO_PASSWORD}`);
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await applySchema(conn);
    const ok = await columnExists(conn, 'usuarios', 'email');
    if (!ok) throw new Error('La tabla usuarios no quedó creada.');
    await seed(conn);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
