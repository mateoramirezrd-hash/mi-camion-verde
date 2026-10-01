# Mi Camión Verde S.A.S – Requisitos e historias de usuario (v2)

Basado en el documento de formulación del proyecto productivo (SENA – SENATIC, Rionegro, Antioquia).

**Tipo de aplicación:** PWA
**Stack:** React + Vite PWA + Tailwind (frontend) · Node.js + Express (backend) · MySQL en Clever Cloud
**Slogan:** "Tu basura en su lugar, el futuro en tus manos."

## 1. Alcance

Plataforma comunitaria de gestión de recolección de residuos, con estos módulos (los del documento):

1. **Calendario y rutas:** días y horarios en que pasa el camión según la zona.
2. **Alertas automatizadas:** recordatorios push antes de que pase el camión.
3. **Panel de incidencias en vivo:** retrasos por tráfico, avería o clima.
4. **Buzón de quejas y reportes:** con fotos y ubicación.
5. **Guía interactiva de separación:** orgánicos, aprovechables y no aprovechables.
6. **Servicio y contratación:** solicitud de recolección y planes semanal, quincenal, mensual o por demanda.
7. **Panel administrativo web:** operación, comercial y reportes.

**Prueba piloto:** un sector o barrio específico, con 20–30 vecinos.

**Fuera de alcance de esta versión** (mejoras futuras del documento): gamificación con puntos e insignias, IoT, blockchain y rastreo GPS del camión en tiempo real.

## 2. Roles y permisos

Según el organigrama, los roles son cuatro. **Administrador y Socio** es un solo rol.

| Rol | Persona en el organigrama | Función principal |
|---|---|---|
| Gerente General | Mateo Ramírez Daza | Visión estratégica y control global |
| Directora Administrativa y Comercial | Mariana Ospina Sánchez | Ventas, planes, facturación y clientes |
| Administrador y Socio | Tomás Ospina Arteaga | Supervisión de la operación diaria |
| Cliente | Ciudadano, familia o comercio | Consulta, recibe alertas y reporta |

| Módulo | Gerente General | Dir. Admón. y Comercial | Administrador y Socio | Cliente |
|---|:-:|:-:|:-:|:-:|
| Usuarios y roles | Total | – | – | Su perfil |
| Zonas, rutas, horarios y vehículos | Consulta | – | Total | Consulta su zona |
| Incidencias | Consulta | Consulta | Publica y resuelve | Ve las de su zona |
| Quejas y reportes | Consulta | Consulta | Atiende | Crea y consulta las suyas |
| Guía de separación | Consulta | – | Gestiona contenido | Consulta |
| Solicitudes y recolecciones | Consulta | Consulta | Gestiona | Crea y consulta las suyas |
| Planes, suscripciones, facturas y pagos | Consulta | Total | – | Consulta los suyos |
| Reportes | Estratégicos | Comerciales | Operativos | Su impacto |
| Auditoría | Total | – | – | – |

## 3. Requisitos funcionales

### Autenticación, perfil y configuración
- **RF-01** Inicio de sesión con correo y contraseña (JWT).
- **RF-02** El cliente se registra por sí mismo; los demás roles los crea el Gerente General.
- **RF-03** Recuperación de contraseña por correo.
- **RF-04** El usuario actualiza sus datos personales desde Configuración.
- **RF-05** El Gerente General crea, edita, activa y bloquea usuarios y asigna roles.
- **RF-06** El acceso a módulos y endpoints se controla por rol.

### Direcciones y zonas
- **RF-07** El cliente gestiona varias direcciones, cada una asociada a una zona (con coordenadas opcionales).
- **RF-08** El Administrador y Socio gestiona zonas y marca cuál es la zona piloto.

### Calendario y rutas
- **RF-09** El Administrador y Socio gestiona rutas por zona y vehículo.
- **RF-10** Define los horarios de paso (día, hora y tipo: ordinaria, reciclable u orgánica).
- **RF-11** El cliente ve el calendario de recolección de la zona de su dirección.
- **RF-12** El cliente ve el próximo paso del camión en la pantalla de inicio.

### Alertas y notificaciones
- **RF-13** El sistema envía un recordatorio push antes del paso del camión, con anticipación configurable.
- **RF-14** El cliente configura sus alertas (activar, minutos de anticipación, canal).
- **RF-15** El sistema guarda un historial de notificaciones con estado leída o no leída.
- **RF-16** La app registra el dispositivo del usuario para recibir notificaciones push.

### Incidencias
- **RF-17** El Administrador y Socio publica una incidencia (tipo, descripción, retraso y nueva hora estimada) para una zona o ruta.
- **RF-18** Al publicarla, el sistema notifica a los clientes de esa zona.
- **RF-19** El cliente ve las incidencias activas de su zona.
- **RF-20** El Administrador y Socio marca la incidencia como resuelta y se avisa a los clientes.

### Buzón de quejas y reportes
- **RF-21** El cliente crea una queja o reporte (acumulación de residuos, contenedor dañado, falla del servicio, sugerencia o inquietud).
- **RF-22** Puede adjuntar fotos y su ubicación.
- **RF-23** El Administrador y Socio ve las quejas, cambia su estado y responde.
- **RF-24** El cliente consulta el estado y la respuesta de sus quejas, con notificación al cambiar.

### Guía de separación
- **RF-25** El cliente consulta la guía por categoría (orgánicos, aprovechables, no aprovechables) con el color de contenedor.
- **RF-26** El Administrador y Socio crea, edita y publica los contenidos de la guía.

### Servicio y contratación
- **RF-27** El cliente solicita una recolección (dirección, fecha, franja, tipos de residuo y kg estimados).
- **RF-28** El cliente consulta y cancela sus solicitudes pendientes.
- **RF-29** El Administrador y Socio programa la solicitud en una ruta y vehículo.
- **RF-30** Se registra cada recolección con el peso real por tipo de residuo.
- **RF-31** La Directora Administrativa y Comercial gestiona planes (semanal, quincenal, mensual, por demanda).
- **RF-32** Gestiona suscripciones de clientes (activar, pausar, cancelar).
- **RF-33** Genera facturas y registra pagos; el estado de la factura se actualiza solo.

### Reportes y auditoría
- **RF-34** Dashboard del Gerente General: kg recolectados, clientes activos, incidencias, quejas e ingresos.
- **RF-35** Reporte de residuos por zona, tipo y mes, exportable a CSV o PDF.
- **RF-36** El cliente ve su impacto (kg reciclados frente a no aprovechables).
- **RF-37** Se registra auditoría de las acciones críticas.

### PWA
- **RF-38** La app es instalable en móvil y escritorio.
- **RF-39** Sin conexión, el cliente puede ver su calendario, la guía de separación y sus últimas notificaciones.
- **RF-40** Las quejas creadas sin conexión se guardan y se envían al volver la red.

## 4. Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| **Rendimiento** | Carga inicial < 3 s en 4G; API con respuesta < 500 ms en el percentil 95. |
| **Oportunidad de las alertas** | Los recordatorios y avisos de retraso se envían dentro de 1 minuto de su hora programada o de la publicación. |
| **Seguridad** | Contraseñas con bcrypt; JWT con expiración; HTTPS; consultas parametrizadas; validación de entradas; rate limiting; CORS restringido. |
| **Protección de datos** | Cumplimiento de la Ley 1581 de 2012; política de privacidad visible; ubicación y fotos solo con consentimiento del usuario. |
| **Usabilidad** | Mobile-first con Tailwind, en español; botones de reporte y calendario fáciles de usar para personas de todas las edades; accesibilidad WCAG 2.1 AA. |
| **Compatibilidad** | Chrome, Edge, Firefox y Safari recientes en Android, iOS y escritorio. En iOS las notificaciones push requieren instalar la PWA. |
| **PWA** | Manifest e íconos completos, service worker, Lighthouse PWA ≥ 90. |
| **Disponibilidad** | Objetivo de 99 % mensual; copias de seguridad diarias de la base de datos. |
| **Almacenamiento de fotos** | Las imágenes de quejas se guardan fuera de la base de datos (solo la URL) y se comprimen antes de subirlas. |
| **Mantenibilidad** | Arquitectura por capas; ESLint/Prettier; variables de entorno; API documentada con Swagger; código en GitHub. |
| **Escalabilidad** | API sin estado, paginación en listados, índices en consultas frecuentes; diseñada para crecer de un sector piloto a todo el municipio. |
| **Integridad y trazabilidad** | Claves foráneas, transacciones en recolecciones y pagos; auditoría de acciones críticas. |
| **Portabilidad** | Despliegue reproducible en Clever Cloud (frontend, backend y MySQL). |

## 5. Historias de usuario

### Cliente

**HU-01 – Registrarme**
Como cliente, quiero crear mi cuenta, para usar la aplicación.
*Criterios:* correo único; contraseña con reglas mínimas; puedo iniciar sesión al terminar.

**HU-02 – Registrar mi dirección y zona**
Como cliente, quiero registrar mi dirección y elegir mi zona, para ver el horario que me corresponde.
*Criterios:* la zona es obligatoria; puedo tener varias direcciones y marcar una como principal.

**HU-03 – Ver cuándo pasa el camión**
Como cliente, quiero ver el calendario de recolección de mi zona, para saber cuándo sacar mi basura.
*Criterios:* muestra día, hora y tipo de recolección; en el inicio veo el próximo paso.

**HU-04 – Recibir un recordatorio**
Como cliente ocupado, quiero recibir una alerta antes de que pase el camión, para no perderlo.
*Criterios:* llega como notificación push; respeta los minutos de anticipación que configuré.

**HU-05 – Configurar mis alertas**
Como cliente, quiero elegir cuándo y cómo recibir avisos, para que no me molesten cuando no quiero.
*Criterios:* puedo activar o desactivar recordatorios y alertas de retraso, y cambiar la anticipación.

**HU-06 – Enterarme de un retraso**
Como cliente, quiero ver y recibir avisos de retrasos en mi zona, para saber cuándo sacar realmente la basura.
*Criterios:* la incidencia muestra causa y nueva hora estimada; recibo notificación al publicarse y al resolverse.

**HU-07 – Reportar un problema con foto y ubicación**
Como cliente, quiero reportar basura acumulada o un contenedor dañado con foto y ubicación, para que lo atiendan.
*Criterios:* elijo el tipo; puedo adjuntar fotos y usar mi ubicación; recibo confirmación de que llegó.

**HU-08 – Seguir mi queja**
Como cliente, quiero ver el estado y la respuesta de mis quejas, para saber si me atendieron.
*Criterios:* veo los estados recibido, en revisión, en atención y resuelto; recibo notificación en cada cambio.

**HU-09 – Aprender a separar**
Como cliente, quiero consultar una guía de separación, para clasificar bien mis residuos.
*Criterios:* categorías con color de contenedor y ejemplos; disponible sin conexión.

**HU-10 – Solicitar una recolección**
Como cliente, quiero pedir una recolección indicando fecha, franja y tipos de residuo, para deshacerme de residuos fuera del horario habitual.
*Criterios:* al menos un tipo de residuo; fecha no pasada; queda como "pendiente".

**HU-11 – Seguir y cancelar mis solicitudes**
Como cliente, quiero ver el estado de mis solicitudes y cancelar las pendientes, para evitar visitas innecesarias.
*Criterios:* filtro por estado; cancelación solo si está pendiente o programada.

**HU-12 – Ver mi plan y mis facturas**
Como cliente, quiero consultar mi plan, mis facturas y pagos, para llevar control de mis costos.
*Criterios:* veo número, total, vencimiento y estado de cada factura.

**HU-13 – Ver mi impacto**
Como cliente, quiero ver cuántos kg reciclé, para motivarme a separar mejor.
*Criterios:* gráfico por tipo de residuo y por mes.

### Administrador y Socio

**HU-14 – Gestionar zonas, rutas y horarios**
Como administrador y socio, quiero crear zonas, rutas y horarios de paso, para que los clientes vean información correcta.
*Criterios:* una ruta pertenece a una zona; puedo desactivar horarios sin borrarlos; los cambios se reflejan en el calendario del cliente.

**HU-15 – Publicar una incidencia**
Como administrador y socio, quiero avisar de un retraso indicando causa y nueva hora, para que los vecinos estén informados.
*Criterios:* elijo zona o ruta; se notifica a los clientes afectados.

**HU-16 – Resolver una incidencia**
Como administrador y socio, quiero cerrar una incidencia cuando el camión retome la ruta, para que los avisos queden al día.
*Criterios:* se guarda la hora de cierre; se avisa a los clientes.

**HU-17 – Atender quejas**
Como administrador y socio, quiero ver las quejas con sus fotos y ubicación, cambiar su estado y responder, para resolver las fallas del servicio.
*Criterios:* filtro por zona, tipo y estado; el cliente recibe la respuesta.

**HU-18 – Mantener la guía de separación**
Como administrador y socio, quiero editar y publicar los contenidos de la guía, para mantenerla actualizada.
*Criterios:* puedo ordenar, publicar u ocultar contenidos.

**HU-19 – Programar solicitudes**
Como administrador y socio, quiero asignar solicitudes pendientes a una ruta y vehículo, para organizar la jornada.
*Criterios:* no supera la capacidad del vehículo; el cliente es notificado.

**HU-20 – Registrar una recolección**
Como administrador y socio, quiero registrar el peso real por tipo de residuo, para tener trazabilidad del servicio.
*Criterios:* la solicitud pasa a "completada"; se guarda quién registró.

**HU-21 – Gestionar vehículos y tipos de residuo**
Como administrador y socio, quiero mantener los vehículos y el catálogo de tipos de residuo, para operar sin errores.
*Criterios:* placa única; puedo marcar un vehículo en mantenimiento.

### Directora Administrativa y Comercial

**HU-22 – Gestionar planes**
Como directora comercial, quiero crear y editar planes con frecuencia y precio, para ofrecer opciones a los clientes.
*Criterios:* puedo desactivar un plan sin perder el historial.

**HU-23 – Gestionar suscripciones**
Como directora comercial, quiero activar, pausar o cancelar suscripciones, para controlar los clientes con servicio vigente.
*Criterios:* se guardan fechas y quién la creó.

**HU-24 – Facturar y registrar pagos**
Como directora comercial, quiero generar facturas y registrar pagos, para mantener la cartera al día.
*Criterios:* número de factura único; pasa a "pagada" cuando se cubre el total.

**HU-25 – Ver indicadores comerciales**
Como directora comercial, quiero ver clientes activos, ingresos y cartera, para orientar la estrategia de ventas.
*Criterios:* filtro por periodo; exportable a CSV.

### Gerente General

**HU-26 – Gestionar usuarios y roles**
Como gerente general, quiero crear usuarios y asignarles roles, para controlar quién accede a qué.
*Criterios:* puedo bloquear usuarios; el cambio de rol aplica al siguiente inicio de sesión.

**HU-27 – Ver el dashboard**
Como gerente general, quiero ver indicadores clave de la operación, para tomar decisiones estratégicas.
*Criterios:* kg recolectados, clientes activos, incidencias, quejas y evolución de la prueba piloto.

**HU-28 – Reporte de residuos**
Como gerente general, quiero un reporte de residuos por zona, tipo y mes, para medir el impacto en la comunidad.
*Criterios:* exportable a CSV o PDF.

**HU-29 – Consultar la auditoría**
Como gerente general, quiero revisar quién hizo qué acción crítica, para garantizar trazabilidad.
*Criterios:* filtro por usuario, entidad y fecha.

### Transversales (PWA)

**HU-30 – Instalar la app**
Como usuario, quiero instalar la aplicación en mi celular, para abrirla como una app nativa y recibir notificaciones.
*Criterios:* aparece la opción de instalación; ícono y nombre correctos.

**HU-31 – Usar la app sin conexión**
Como usuario con mala señal, quiero seguir viendo mi calendario y la guía, y dejar quejas pendientes de envío, para no perder información.
*Criterios:* las quejas guardadas se envían al volver la conexión y se me avisa del resultado.
