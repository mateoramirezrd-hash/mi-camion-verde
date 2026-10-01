-- =====================================================================
-- Mi Camión Verde S.A.S - Esquema de base de datos v2 (MySQL 8)
-- Pensado para Clever Cloud: la base de datos ya viene creada con el
-- add-on, por eso no se incluye CREATE DATABASE ni USE.
--
-- Si ya ejecutaste la versión anterior, descomenta el bloque 0 para
-- borrar las tablas antiguas (incluidas socios y pqrs, que ya no existen).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 0. LIMPIEZA OPCIONAL (descomentar solo si necesitas empezar de cero)
-- ---------------------------------------------------------------------
-- DROP VIEW  IF EXISTS v_residuos_por_zona_mes;
-- DROP TABLE IF EXISTS auditoria, notificaciones, dispositivos_push,
--     preferencias_notificacion, queja_evidencias, quejas_reportes, pqrs,
--     recoleccion_detalle, recolecciones, solicitud_detalle,
--     solicitudes_recoleccion, pagos, facturas, suscripciones, planes,
--     incidencias, horarios_ruta, rutas, vehiculos, guia_separacion,
--     tipos_residuo, direcciones, zonas, clientes, socios, usuarios, roles;

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD Y USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(50)  NOT NULL,
    descripcion VARCHAR(200) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    rol_id        INT UNSIGNED NOT NULL,
    nombres       VARCHAR(80)  NOT NULL,
    apellidos     VARCHAR(80)  NOT NULL,
    email         VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono      VARCHAR(20)  NULL,
    estado        ENUM('activo','inactivo','bloqueado') NOT NULL DEFAULT 'activo',
    ultimo_acceso DATETIME     NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    KEY idx_usuarios_rol (rol_id),
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. CLIENTES, ZONAS Y DIRECCIONES
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id       INT UNSIGNED NOT NULL,
    tipo_cliente     ENUM('hogar','comercio','institucion') NOT NULL DEFAULT 'hogar',
    tipo_documento   ENUM('CC','CE','NIT','PP') NOT NULL DEFAULT 'CC',
    numero_documento VARCHAR(20)  NOT NULL,
    nombre_comercial VARCHAR(120) NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clientes_usuario (usuario_id),
    UNIQUE KEY uq_clientes_documento (tipo_documento, numero_documento),
    CONSTRAINT fk_clientes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE zonas (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre    VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    es_piloto TINYINT(1)   NOT NULL DEFAULT 0,
    activa    TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_zonas_nombre_municipio (nombre, municipio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE direcciones (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id   INT UNSIGNED NOT NULL,
    zona_id      INT UNSIGNED NOT NULL,
    alias        VARCHAR(50)  NOT NULL DEFAULT 'Principal',
    direccion    VARCHAR(200) NOT NULL,
    referencia   VARCHAR(200) NULL,
    latitud      DECIMAL(10,7) NULL,
    longitud     DECIMAL(10,7) NULL,
    es_principal TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_direcciones_cliente (cliente_id),
    KEY idx_direcciones_zona (zona_id),
    CONSTRAINT fk_direcciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE,
    CONSTRAINT fk_direcciones_zona    FOREIGN KEY (zona_id)    REFERENCES zonas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. CATÁLOGO DE RESIDUOS Y GUÍA INTERACTIVA DE SEPARACIÓN
-- ---------------------------------------------------------------------
CREATE TABLE tipos_residuo (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre            VARCHAR(80)  NOT NULL,
    categoria         ENUM('organico','reciclable','no_aprovechable','peligroso','especial') NOT NULL,
    color_contenedor  ENUM('blanco','negro','verde') NULL,
    descripcion       VARCHAR(255) NULL,
    activo            TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tipos_residuo_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guia_separacion (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tipo_residuo_id INT UNSIGNED NULL,
    titulo          VARCHAR(120) NOT NULL,
    resumen         VARCHAR(255) NULL,
    contenido       TEXT NOT NULL,
    icono_url       VARCHAR(500) NULL,
    orden           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    publicada       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_guia_tipo (tipo_residuo_id),
    KEY idx_guia_publicada_orden (publicada, orden),
    CONSTRAINT fk_guia_tipo FOREIGN KEY (tipo_residuo_id) REFERENCES tipos_residuo (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. OPERACIÓN: VEHÍCULOS, RUTAS, HORARIOS E INCIDENCIAS
-- ---------------------------------------------------------------------
CREATE TABLE vehiculos (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    placa        VARCHAR(10)  NOT NULL,
    tipo         VARCHAR(50)  NULL,
    capacidad_kg DECIMAL(10,2) NOT NULL,
    estado       ENUM('disponible','en_ruta','mantenimiento','inactivo') NOT NULL DEFAULT 'disponible',
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehiculos_placa (placa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rutas (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    zona_id     INT UNSIGNED NOT NULL,
    vehiculo_id INT UNSIGNED NULL,
    nombre      VARCHAR(100) NOT NULL,
    activa      TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY idx_rutas_zona (zona_id),
    KEY idx_rutas_vehiculo (vehiculo_id),
    CONSTRAINT fk_rutas_zona     FOREIGN KEY (zona_id)     REFERENCES zonas (id),
    CONSTRAINT fk_rutas_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Calendario: días y horas en que pasa el camión por cada ruta/zona
CREATE TABLE horarios_ruta (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ruta_id          INT UNSIGNED NOT NULL,
    dia_semana       ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
    hora_paso        TIME NOT NULL,
    tipo_recoleccion ENUM('ordinaria','reciclable','organica') NOT NULL DEFAULT 'ordinaria',
    activo           TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_horario (ruta_id, dia_semana, tipo_recoleccion, hora_paso),
    CONSTRAINT fk_horarios_ruta FOREIGN KEY (ruta_id) REFERENCES rutas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Panel de incidencias en vivo: retrasos por tráfico, avería o clima
CREATE TABLE incidencias (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    zona_id             INT UNSIGNED NOT NULL,
    ruta_id             INT UNSIGNED NULL,
    tipo                ENUM('trafico','averia','clima','otro') NOT NULL,
    descripcion         VARCHAR(255) NOT NULL,
    retraso_minutos     SMALLINT UNSIGNED NULL,
    nueva_hora_estimada TIME NULL,
    estado              ENUM('activa','resuelta') NOT NULL DEFAULT 'activa',
    creada_por          INT UNSIGNED NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelta_at         DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_incidencias_zona_estado (zona_id, estado),
    KEY idx_incidencias_ruta (ruta_id),
    CONSTRAINT fk_incidencias_zona  FOREIGN KEY (zona_id)    REFERENCES zonas (id),
    CONSTRAINT fk_incidencias_ruta  FOREIGN KEY (ruta_id)    REFERENCES rutas (id) ON DELETE SET NULL,
    CONSTRAINT fk_incidencias_autor FOREIGN KEY (creada_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. BUZÓN DE QUEJAS Y REPORTES (con fotos y ubicación)
-- ---------------------------------------------------------------------
CREATE TABLE quejas_reportes (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id           INT UNSIGNED NOT NULL,
    zona_id              INT UNSIGNED NULL,
    tipo                 ENUM('acumulacion_residuos','contenedor_danado','falla_servicio','sugerencia','inquietud') NOT NULL,
    descripcion          TEXT NOT NULL,
    latitud              DECIMAL(10,7) NULL,
    longitud             DECIMAL(10,7) NULL,
    referencia_ubicacion VARCHAR(200) NULL,
    estado               ENUM('recibido','en_revision','en_atencion','resuelto','rechazado') NOT NULL DEFAULT 'recibido',
    respuesta            TEXT NULL,
    atendido_por         INT UNSIGNED NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resuelto_at          DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_quejas_cliente (cliente_id),
    KEY idx_quejas_estado (estado),
    KEY idx_quejas_zona (zona_id),
    CONSTRAINT fk_quejas_cliente  FOREIGN KEY (cliente_id)   REFERENCES clientes (id),
    CONSTRAINT fk_quejas_zona     FOREIGN KEY (zona_id)      REFERENCES zonas (id) ON DELETE SET NULL,
    CONSTRAINT fk_quejas_atendido FOREIGN KEY (atendido_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Las imágenes se guardan en un almacenamiento de archivos; aquí solo la URL
CREATE TABLE queja_evidencias (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    queja_id   INT UNSIGNED NOT NULL,
    url        VARCHAR(500) NOT NULL,
    tipo       ENUM('foto','video') NOT NULL DEFAULT 'foto',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_evidencias_queja (queja_id),
    CONSTRAINT fk_evidencias_queja FOREIGN KEY (queja_id) REFERENCES quejas_reportes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. ALERTAS Y NOTIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE preferencias_notificacion (
    id                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id                INT UNSIGNED NOT NULL,
    recordatorio_activo       TINYINT(1) NOT NULL DEFAULT 1,
    minutos_antes             SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    alertas_retraso           TINYINT(1) NOT NULL DEFAULT 1,
    notificar_estado_servicio TINYINT(1) NOT NULL DEFAULT 1,
    canal_push                TINYINT(1) NOT NULL DEFAULT 1,
    canal_correo              TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pref_usuario (usuario_id),
    CONSTRAINT fk_pref_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- token_hash = SHA-256 del token/suscripción (lo calcula el backend) para evitar duplicados
CREATE TABLE dispositivos_push (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    plataforma ENUM('web','android','ios') NOT NULL DEFAULT 'web',
    token_push TEXT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    activo     TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_dispositivo_hash (token_hash),
    KEY idx_dispositivos_usuario (usuario_id, activo),
    CONSTRAINT fk_dispositivos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notificaciones (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED NOT NULL,
    tipo            ENUM('recordatorio','retraso','estado_solicitud','respuesta_queja','factura','sistema') NOT NULL,
    titulo          VARCHAR(120) NOT NULL,
    mensaje         VARCHAR(255) NOT NULL,
    referencia_tipo VARCHAR(30)  NULL,
    referencia_id   INT UNSIGNED NULL,
    leida           TINYINT(1) NOT NULL DEFAULT 0,
    enviada_push    TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notif_usuario_leida (usuario_id, leida),
    KEY idx_notif_referencia (referencia_tipo, referencia_id),
    CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. SERVICIO: SOLICITUDES Y RECOLECCIONES (trazabilidad por tipo y peso)
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes_recoleccion (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id       INT UNSIGNED NOT NULL,
    direccion_id     INT UNSIGNED NOT NULL,
    ruta_id          INT UNSIGNED NULL,
    fecha_programada DATE NOT NULL,
    franja           ENUM('manana','tarde') NOT NULL DEFAULT 'manana',
    estado           ENUM('pendiente','programada','en_camino','completada','cancelada') NOT NULL DEFAULT 'pendiente',
    observaciones    VARCHAR(255) NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_solicitudes_cliente (cliente_id),
    KEY idx_solicitudes_estado_fecha (estado, fecha_programada),
    KEY idx_solicitudes_ruta (ruta_id),
    CONSTRAINT fk_solicitudes_cliente   FOREIGN KEY (cliente_id)   REFERENCES clientes (id),
    CONSTRAINT fk_solicitudes_direccion FOREIGN KEY (direccion_id) REFERENCES direcciones (id),
    CONSTRAINT fk_solicitudes_ruta      FOREIGN KEY (ruta_id)      REFERENCES rutas (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE solicitud_detalle (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    solicitud_id         INT UNSIGNED NOT NULL,
    tipo_residuo_id      INT UNSIGNED NOT NULL,
    cantidad_estimada_kg DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_solicitud_tipo (solicitud_id, tipo_residuo_id),
    CONSTRAINT fk_soldet_solicitud FOREIGN KEY (solicitud_id)    REFERENCES solicitudes_recoleccion (id) ON DELETE CASCADE,
    CONSTRAINT fk_soldet_tipo      FOREIGN KEY (tipo_residuo_id) REFERENCES tipos_residuo (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recolecciones (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    solicitud_id      INT UNSIGNED NOT NULL,
    vehiculo_id       INT UNSIGNED NOT NULL,
    registrado_por    INT UNSIGNED NULL,
    fecha_hora_inicio DATETIME NOT NULL,
    fecha_hora_fin    DATETIME NULL,
    estado            ENUM('en_curso','finalizada','fallida') NOT NULL DEFAULT 'en_curso',
    observaciones     VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recolecciones_solicitud (solicitud_id),
    KEY idx_recolecciones_vehiculo (vehiculo_id),
    CONSTRAINT fk_recol_solicitud  FOREIGN KEY (solicitud_id)   REFERENCES solicitudes_recoleccion (id),
    CONSTRAINT fk_recol_vehiculo   FOREIGN KEY (vehiculo_id)    REFERENCES vehiculos (id),
    CONSTRAINT fk_recol_registrado FOREIGN KEY (registrado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recoleccion_detalle (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    recoleccion_id  INT UNSIGNED NOT NULL,
    tipo_residuo_id INT UNSIGNED NOT NULL,
    peso_kg         DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recdet_tipo (recoleccion_id, tipo_residuo_id),
    CONSTRAINT fk_recdet_recoleccion FOREIGN KEY (recoleccion_id)  REFERENCES recolecciones (id) ON DELETE CASCADE,
    CONSTRAINT fk_recdet_tipo        FOREIGN KEY (tipo_residuo_id) REFERENCES tipos_residuo (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. COMERCIAL: PLANES, SUSCRIPCIONES, FACTURAS Y PAGOS
-- ---------------------------------------------------------------------
CREATE TABLE planes (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(80)  NOT NULL,
    descripcion VARCHAR(255) NULL,
    frecuencia  ENUM('semanal','quincenal','mensual','demanda') NOT NULL,
    precio      DECIMAL(12,2) NOT NULL,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_planes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE suscripciones (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente_id   INT UNSIGNED NOT NULL,
    plan_id      INT UNSIGNED NOT NULL,
    creada_por   INT UNSIGNED NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NULL,
    estado       ENUM('activa','pausada','cancelada','vencida') NOT NULL DEFAULT 'activa',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_suscripciones_cliente (cliente_id),
    KEY idx_suscripciones_plan (plan_id),
    CONSTRAINT fk_suscripciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT fk_suscripciones_plan    FOREIGN KEY (plan_id)    REFERENCES planes (id),
    CONSTRAINT fk_suscripciones_creada  FOREIGN KEY (creada_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE facturas (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    suscripcion_id    INT UNSIGNED NOT NULL,
    numero            VARCHAR(30)  NOT NULL,
    fecha_emision     DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    subtotal          DECIMAL(12,2) NOT NULL,
    impuestos         DECIMAL(12,2) NOT NULL DEFAULT 0,
    total             DECIMAL(12,2) NOT NULL,
    estado            ENUM('pendiente','pagada','vencida','anulada') NOT NULL DEFAULT 'pendiente',
    PRIMARY KEY (id),
    UNIQUE KEY uq_facturas_numero (numero),
    KEY idx_facturas_suscripcion (suscripcion_id),
    KEY idx_facturas_estado (estado),
    CONSTRAINT fk_facturas_suscripcion FOREIGN KEY (suscripcion_id) REFERENCES suscripciones (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    factura_id     INT UNSIGNED NOT NULL,
    monto          DECIMAL(12,2) NOT NULL,
    metodo         ENUM('efectivo','transferencia','tarjeta','pse') NOT NULL,
    referencia     VARCHAR(80) NULL,
    fecha_pago     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por INT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_pagos_factura (factura_id),
    CONSTRAINT fk_pagos_factura    FOREIGN KEY (factura_id)     REFERENCES facturas (id),
    CONSTRAINT fk_pagos_registrado FOREIGN KEY (registrado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. AUDITORÍA
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NULL,
    accion     VARCHAR(50)  NOT NULL,
    entidad    VARCHAR(50)  NOT NULL,
    entidad_id INT UNSIGNED NULL,
    detalle    JSON NULL,
    ip         VARCHAR(45)  NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_auditoria_usuario (usuario_id),
    KEY idx_auditoria_entidad (entidad, entidad_id),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 10. VISTAS PARA REPORTES
-- ---------------------------------------------------------------------
-- Kilos recolectados por zona, mes y categoría de residuo
CREATE OR REPLACE VIEW v_residuos_por_zona_mes AS
SELECT
    z.nombre                               AS zona,
    DATE_FORMAT(r.fecha_hora_fin, '%Y-%m') AS mes,
    tr.categoria                           AS categoria,
    SUM(rd.peso_kg)                        AS total_kg
FROM recoleccion_detalle rd
JOIN recolecciones r           ON r.id  = rd.recoleccion_id
JOIN solicitudes_recoleccion s ON s.id  = r.solicitud_id
JOIN direcciones d             ON d.id  = s.direccion_id
JOIN zonas z                   ON z.id  = d.zona_id
JOIN tipos_residuo tr          ON tr.id = rd.tipo_residuo_id
WHERE r.estado = 'finalizada'
GROUP BY z.nombre, DATE_FORMAT(r.fecha_hora_fin, '%Y-%m'), tr.categoria;

-- Próximos pasos del camión por zona (para el calendario y los recordatorios)
CREATE OR REPLACE VIEW v_calendario_zona AS
SELECT
    z.id AS zona_id,
    z.nombre AS zona,
    ru.id AS ruta_id,
    ru.nombre AS ruta,
    h.dia_semana,
    h.hora_paso,
    h.tipo_recoleccion
FROM horarios_ruta h
JOIN rutas ru ON ru.id = h.ruta_id AND ru.activa = 1
JOIN zonas z  ON z.id  = ru.zona_id AND z.activa = 1
WHERE h.activo = 1;

-- ---------------------------------------------------------------------
-- 11. DATOS INICIALES
-- ---------------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
    ('gerente_general',           'Dirige la visión estratégica, gestiona usuarios y ve los reportes globales'),
    ('directora_admin_comercial', 'Estrategia de ventas, planes, suscripciones, facturación y clientes'),
    ('administrador_socio',       'Supervisa la operación diaria: rutas, incidencias, quejas y recolecciones'),
    ('cliente',                   'Ciudadano, familia o comercio que consulta horarios, recibe alertas y reporta');

INSERT INTO tipos_residuo (nombre, categoria, color_contenedor, descripcion) VALUES
    ('Residuos de alimentos',     'organico',        'verde',  'Restos de cocina y comida'),
    ('Residuos de poda y jardín', 'organico',        'verde',  'Hojas, ramas y césped'),
    ('Papel y cartón',            'reciclable',      'blanco', 'Papel limpio y seco, cartón y empaques de cartón'),
    ('Plástico',                  'reciclable',      'blanco', 'Botellas, envases y bolsas limpias'),
    ('Vidrio',                    'reciclable',      'blanco', 'Botellas y frascos de vidrio'),
    ('Metales',                   'reciclable',      'blanco', 'Latas y chatarra ligera'),
    ('Residuos ordinarios',       'no_aprovechable', 'negro',  'Residuos sanitarios y no reciclables'),
    ('Residuos electrónicos',     'especial',        NULL,     'Aparatos eléctricos y electrónicos'),
    ('Pilas y baterías',          'peligroso',       NULL,     'Requieren manejo diferenciado'),
    ('Aceite de cocina usado',    'especial',        NULL,     'Aceite vegetal usado en recipiente cerrado');

INSERT INTO guia_separacion (tipo_residuo_id, titulo, resumen, contenido, orden) VALUES
    ((SELECT id FROM tipos_residuo WHERE nombre = 'Residuos de alimentos'),
     'Residuos orgánicos', 'Restos de comida y jardín: contenedor verde.',
     'Aquí van cáscaras, restos de frutas y verduras, y residuos de poda. Escúrrelos y no los mezcles con plásticos ni vidrio.', 1),
    ((SELECT id FROM tipos_residuo WHERE nombre = 'Plástico'),
     'Residuos aprovechables', 'Plástico, vidrio, metal, papel y cartón: contenedor blanco.',
     'Deben estar limpios y secos. Enjuaga los envases y aplasta las botellas para ahorrar espacio.', 2),
    ((SELECT id FROM tipos_residuo WHERE nombre = 'Residuos ordinarios'),
     'Residuos no aprovechables', 'Papel higiénico, servilletas usadas y similares: contenedor negro.',
     'Aquí van los residuos que no se pueden reciclar ni compostar. Reducirlos empieza por separar bien los demás.', 3);

INSERT INTO planes (nombre, descripcion, frecuencia, precio) VALUES
    ('Semanal',     'Una recolección por semana',       'semanal',   45000.00),
    ('Quincenal',   'Una recolección cada 15 días',     'quincenal', 30000.00),
    ('Mensual',     'Una recolección al mes',           'mensual',   18000.00),
    ('Por demanda', 'Se cobra por cada solicitud',      'demanda',   12000.00);

-- Los precios de los planes son valores de ejemplo: ajústalos con la
-- Directora Administrativa y Comercial antes de la prueba piloto.
