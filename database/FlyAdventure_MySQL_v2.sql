/*
===========================================================
PROYECTO DE AULA - FLYADVENTURE
Base de datos relacional de la plataforma de reservas de parapente
Motor: MySQL 8.0.16 o superior (recomendado 8.4 LTS)
Fuente: Diagrama Entidad-Relacion FlyAdventure
Versión: 2.0 (etapa de desarrollo, octubre de 2026)

Cambios frente a la versión 1:
- Nuevo rol Cliente: el cliente puede crear una cuenta para
  consultar su historial de vuelos. Registrarse sigue siendo
  OPCIONAL para reservar.
- Se elimina el rol Operador: los roles son Administrador,
  Piloto y Cliente. Solo un Administrador crea administradores
  y pilotos.
- CLIENTE.id_usuario (opcional y único) enlaza al cliente con su
  cuenta. Una reserva hecha como invitado queda en el historial
  cuando el cliente se registra con el mismo documento.
- Sin pasarela de pagos: el pago se acuerda por WhatsApp y el
  administrador lo confirma en el panel. Se elimina la tabla
  EVENTO_PAGO (webhooks) y PAGO registra quién confirmó.
- RESERVA guarda las observaciones del pasajero.
- CLIENTE.fecha_nacimiento pasa a ser opcional (la reserva
  pide la edad).
- Bloques horarios de 30 minutos (09:00 a 16:30) con 5 cupos,
  igual que la página.
- Usuarios de prueba con contraseña real cifrada con BCrypt.
  Contraseña de todos: FlyAdventure2026*
===========================================================

Orden de ejecución:
1. Catálogos (tablas sin llaves foráneas)
2. Tablas principales
3. Tablas dependientes de RESERVA
4. Tablas asociativas
5. Índices
6. Datos de prueba
7. Consultas de demostración
8. Pruebas de restricciones
*/

/* ========================================================
1. CREAR LA BASE DE DATOS
En MySQL no hace falta reconectarse: basta con USE.
======================================================== */

/* Fuerza UTF-8 en la sesión para que las tildes se guarden bien
   aunque el cliente de MySQL use otra codificación por defecto. */
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS flyadventure;

CREATE DATABASE flyadventure
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE flyadventure;

/* ========================================================
2. CATÁLOGOS
Tablas pequeñas de valores fijos. Las demás las referencian.
======================================================== */

/* ROL: Administrador, Piloto, Cliente */
CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT,
    nombre_rol VARCHAR(30) NOT NULL,
    descripcion VARCHAR(150),

    CONSTRAINT pk_rol PRIMARY KEY (id_rol),
    CONSTRAINT uq_rol_nombre UNIQUE (nombre_rol)
) ENGINE = InnoDB;

/* ESTADO DE LA RESERVA */
CREATE TABLE estado_reserva (
    id_estado_reserva INT AUTO_INCREMENT,
    nombre_estado VARCHAR(20) NOT NULL,
    descripcion VARCHAR(100),

    CONSTRAINT pk_estado_reserva PRIMARY KEY (id_estado_reserva),
    CONSTRAINT uq_estado_reserva_nombre UNIQUE (nombre_estado)
) ENGINE = InnoDB;

/* ESTADO DEL PAGO (pago acordado por WhatsApp y confirmado en el panel) */
CREATE TABLE estado_pago (
    id_estado_pago INT AUTO_INCREMENT,
    nombre_estado VARCHAR(20) NOT NULL,
    descripcion VARCHAR(100),

    CONSTRAINT pk_estado_pago PRIMARY KEY (id_estado_pago),
    CONSTRAINT uq_estado_pago_nombre UNIQUE (nombre_estado)
) ENGINE = InnoDB;

/* CONDICIÓN DE SALUD que el pasajero puede declarar */
CREATE TABLE condicion_salud (
    id_condicion INT AUTO_INCREMENT,
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200),
    efecto VARCHAR(20) NOT NULL,

    CONSTRAINT pk_condicion_salud PRIMARY KEY (id_condicion),
    CONSTRAINT uq_condicion_nombre UNIQUE (nombre),
    CONSTRAINT ck_condicion_efecto
        CHECK (efecto IN ('Informativa', 'Precaución', 'Excluyente'))
) ENGINE = InnoDB;

/* BLOQUE HORARIO de vuelo */
CREATE TABLE bloque_horario (
    id_bloque INT AUTO_INCREMENT,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_maximo TINYINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_bloque_horario PRIMARY KEY (id_bloque),
    CONSTRAINT uq_bloque_horas UNIQUE (hora_inicio, hora_fin),
    CONSTRAINT ck_bloque_horas
        CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_bloque_cupo
        CHECK (cupo_maximo BETWEEN 1 AND 20)
) ENGINE = InnoDB;

/* SERVICIO DE VUELO ofrecido en la página */
CREATE TABLE servicio_vuelo (
    id_servicio INT AUTO_INCREMENT,
    titulo VARCHAR(80) NOT NULL,
    descripcion VARCHAR(500),
    precio DECIMAL(10,2) NOT NULL,
    duracion_minutos SMALLINT NOT NULL,
    imagen_url VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_servicio_vuelo PRIMARY KEY (id_servicio),
    CONSTRAINT uq_servicio_titulo UNIQUE (titulo),
    CONSTRAINT ck_servicio_precio
        CHECK (precio > 0),
    CONSTRAINT ck_servicio_duracion
        CHECK (duracion_minutos BETWEEN 5 AND 240)
) ENGINE = InnoDB;

/* EQUIPO DE VUELO (parapente) */
CREATE TABLE equipo_vuelo (
    id_equipo INT AUTO_INCREMENT,
    identificador VARCHAR(20) NOT NULL,
    marca VARCHAR(40) NOT NULL,
    modelo VARCHAR(40) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    peso_minimo DECIMAL(5,2) NOT NULL,
    peso_maximo DECIMAL(5,2) NOT NULL,
    fecha_ultima_revision DATE NOT NULL,
    fecha_proxima_revision DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Disponible',

    CONSTRAINT pk_equipo_vuelo PRIMARY KEY (id_equipo),
    CONSTRAINT uq_equipo_identificador UNIQUE (identificador),
    CONSTRAINT ck_equipo_tipo
        CHECK (tipo IN ('Biplaza', 'Monoplaza')),
    CONSTRAINT ck_equipo_pesos
        CHECK (peso_minimo > 0 AND peso_maximo > peso_minimo),
    CONSTRAINT ck_equipo_revision
        CHECK (fecha_proxima_revision > fecha_ultima_revision),
    CONSTRAINT ck_equipo_estado
        CHECK (estado IN ('Disponible', 'En mantenimiento', 'Fuera de servicio'))
) ENGINE = InnoDB;

/* RESUMEN DE PERCEPCIÓN: síntesis de encuestas generada por la IA */
CREATE TABLE resumen_percepcion (
    id_resumen INT AUTO_INCREMENT,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    total_respuestas INT NOT NULL DEFAULT 0,
    porcentaje_satisfaccion DECIMAL(5,2),
    temas_recurrentes VARCHAR(300),
    resumen VARCHAR(1000),
    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_resumen_percepcion PRIMARY KEY (id_resumen),
    CONSTRAINT uq_resumen_periodo UNIQUE (periodo_inicio, periodo_fin),
    CONSTRAINT ck_resumen_periodo
        CHECK (periodo_fin >= periodo_inicio),
    CONSTRAINT ck_resumen_total
        CHECK (total_respuestas >= 0),
    CONSTRAINT ck_resumen_porcentaje
        CHECK (porcentaje_satisfaccion IS NULL
               OR porcentaje_satisfaccion BETWEEN 0 AND 100)
) ENGINE = InnoDB;

/* ========================================================
3. TABLAS PRINCIPALES
======================================================== */

/* USUARIO: cuenta para iniciar sesión (administrador, piloto o cliente) */
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT,
    id_rol INT NOT NULL,
    tipo_documento VARCHAR(5) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    contrasena_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso DATETIME,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_documento UNIQUE (numero_documento),
    CONSTRAINT uq_usuario_correo UNIQUE (correo),

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_usuario_tipo_documento
        CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PA', 'PPT')),
    CONSTRAINT ck_usuario_nombres
        CHECK (CHAR_LENGTH(TRIM(nombres)) >= 2),
    CONSTRAINT ck_usuario_correo
        CHECK (correo LIKE '%_@_%._%')
) ENGINE = InnoDB;

/* PILOTO: un usuario con rol Piloto (relación 1 a 0..1) */
CREATE TABLE piloto (
    id_piloto INT AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    numero_licencia VARCHAR(20) NOT NULL,
    nivel_certificacion VARCHAR(30) NOT NULL,
    fecha_venc_certificacion DATE NOT NULL,
    horas_vuelo INT NOT NULL DEFAULT 0,
    peso_kg DECIMAL(5,2) NOT NULL,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_piloto PRIMARY KEY (id_piloto),
    CONSTRAINT uq_piloto_usuario UNIQUE (id_usuario),
    CONSTRAINT uq_piloto_licencia UNIQUE (numero_licencia),

    CONSTRAINT fk_piloto_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_piloto_certificacion
        CHECK (nivel_certificacion IN ('Piloto biplaza', 'Instructor', 'Instructor examinador')),
    CONSTRAINT ck_piloto_horas
        CHECK (horas_vuelo >= 0),
    CONSTRAINT ck_piloto_peso
        CHECK (peso_kg BETWEEN 40 AND 150)
) ENGINE = InnoDB;

/* CLIENTE: persona que reserva. Puede reservar como invitado
   (id_usuario NULL) o tener cuenta (id_usuario con rol Cliente). */
CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT,
    id_usuario INT,
    tipo_documento VARCHAR(5) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    fecha_nacimiento DATE,
    contacto_emergencia VARCHAR(100),
    telefono_emergencia VARCHAR(15),
    autoriza_datos BOOLEAN NOT NULL,
    fecha_autorizacion DATETIME NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_cliente PRIMARY KEY (id_cliente),
    CONSTRAINT uq_cliente_documento UNIQUE (numero_documento),
    /* Una cuenta pertenece a un solo cliente (1 a 0..1) */
    CONSTRAINT uq_cliente_usuario UNIQUE (id_usuario),

    CONSTRAINT fk_cliente_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_cliente_tipo_documento
        CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PA', 'PPT')),
    CONSTRAINT ck_cliente_nombres
        CHECK (CHAR_LENGTH(TRIM(nombres)) >= 2),
    CONSTRAINT ck_cliente_correo
        CHECK (correo LIKE '%_@_%._%'),
    /* Habeas data (Ley 1581 de 2012): sin autorización no se registra */
    CONSTRAINT ck_cliente_autoriza_datos
        CHECK (autoriza_datos = TRUE),
    CONSTRAINT ck_cliente_contacto_emergencia
        CHECK (contacto_emergencia IS NULL OR telefono_emergencia IS NOT NULL)
) ENGINE = InnoDB;

/* RESERVA: entidad central del modelo */
CREATE TABLE reserva (
    id_reserva INT AUTO_INCREMENT,
    codigo VARCHAR(12) NOT NULL,
    id_cliente INT NOT NULL,
    id_servicio INT NOT NULL,
    id_bloque INT NOT NULL,
    id_estado_reserva INT NOT NULL,
    fecha_vuelo DATE NOT NULL,
    peso_pasajero DECIMAL(5,2) NOT NULL,
    edad_pasajero TINYINT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    canal VARCHAR(15) NOT NULL DEFAULT 'Web',
    observaciones VARCHAR(500),
    acepta_terminos BOOLEAN NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME,

    CONSTRAINT pk_reserva PRIMARY KEY (id_reserva),
    CONSTRAINT uq_reserva_codigo UNIQUE (codigo),

    CONSTRAINT fk_reserva_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicio_vuelo(id_servicio)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_bloque
        FOREIGN KEY (id_bloque)
        REFERENCES bloque_horario(id_bloque)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reserva_estado
        FOREIGN KEY (id_estado_reserva)
        REFERENCES estado_reserva(id_estado_reserva)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    /* Límites físicos. Los límites del negocio (peso y edad
       permitidos) están en PARAMETRO_OPERACION. */
    CONSTRAINT ck_reserva_peso
        CHECK (peso_pasajero BETWEEN 15 AND 150),
    CONSTRAINT ck_reserva_edad
        CHECK (edad_pasajero BETWEEN 1 AND 100),
    CONSTRAINT ck_reserva_valor
        CHECK (valor_total > 0),
    CONSTRAINT ck_reserva_canal
        CHECK (canal IN ('Web', 'WhatsApp', 'Presencial', 'Asistente IA')),
    CONSTRAINT ck_reserva_terminos
        CHECK (acepta_terminos = TRUE),
    CONSTRAINT ck_reserva_expiracion
        CHECK (fecha_expiracion IS NULL OR fecha_expiracion > fecha_creacion)
) ENGINE = InnoDB;

/* ========================================================
4. TABLAS DEPENDIENTES DE USUARIO Y PILOTO
======================================================== */

/* PARÁMETRO DE OPERACIÓN: reglas configurables desde el panel */
CREATE TABLE parametro_operacion (
    id_parametro INT AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    clave VARCHAR(40) NOT NULL,
    valor VARCHAR(40) NOT NULL,
    descripcion VARCHAR(150),
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_parametro_operacion PRIMARY KEY (id_parametro),
    CONSTRAINT uq_parametro_clave UNIQUE (clave),

    CONSTRAINT fk_parametro_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

/* CONSULTA ANALÍTICA: preguntas al analista conversacional (IA) */
CREATE TABLE consulta_analitica (
    id_consulta INT AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    pregunta VARCHAR(300) NOT NULL,
    consulta_generada VARCHAR(1000),
    respuesta VARCHAR(1000),
    tipo_grafico VARCHAR(20),
    fecha_consulta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_consulta_analitica PRIMARY KEY (id_consulta),

    CONSTRAINT fk_consulta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_consulta_tipo_grafico
        CHECK (tipo_grafico IS NULL
               OR tipo_grafico IN ('Barras', 'Líneas', 'Torta', 'Tabla', 'Indicador'))
) ENGINE = InnoDB;

/* DISPONIBILIDAD DEL PILOTO por fecha y bloque */
CREATE TABLE disponibilidad_piloto (
    id_disponibilidad INT AUTO_INCREMENT,
    id_piloto INT NOT NULL,
    id_bloque INT NOT NULL,
    fecha DATE NOT NULL,

    CONSTRAINT pk_disponibilidad_piloto PRIMARY KEY (id_disponibilidad),
    CONSTRAINT uq_disponibilidad UNIQUE (id_piloto, id_bloque, fecha),

    CONSTRAINT fk_disponibilidad_piloto
        FOREIGN KEY (id_piloto)
        REFERENCES piloto(id_piloto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_disponibilidad_bloque
        FOREIGN KEY (id_bloque)
        REFERENCES bloque_horario(id_bloque)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

/* ========================================================
5. TABLAS DEPENDIENTES DE RESERVA
======================================================== */

/* ASIGNACIÓN piloto + equipo a una reserva (1 a 0..1).
   La IA la recomienda y un usuario la aprueba. */
CREATE TABLE asignacion (
    id_asignacion INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    id_piloto INT NOT NULL,
    id_equipo INT NOT NULL,
    id_usuario INT NOT NULL,
    puntaje DECIMAL(5,2),
    recomendada_ia BOOLEAN NOT NULL DEFAULT FALSE,
    explicacion VARCHAR(500),
    justificacion VARCHAR(300),
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_asignacion PRIMARY KEY (id_asignacion),
    CONSTRAINT uq_asignacion_reserva UNIQUE (id_reserva),

    CONSTRAINT fk_asignacion_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_asignacion_piloto
        FOREIGN KEY (id_piloto)
        REFERENCES piloto(id_piloto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_equipo
        FOREIGN KEY (id_equipo)
        REFERENCES equipo_vuelo(id_equipo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_asignacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_asignacion_puntaje
        CHECK (puntaje IS NULL OR puntaje BETWEEN 0 AND 100),
    /* Si el usuario no aceptó la recomendación de la IA, debe justificar */
    CONSTRAINT ck_asignacion_justificacion
        CHECK (recomendada_ia = TRUE OR justificacion IS NOT NULL)
) ENGINE = InnoDB;

/* CAMBIO DE ESTADO: historial (auditoría) de la reserva.
   id_usuario y id_estado_anterior son opcionales: el primer
   estado no tiene anterior y algunos cambios los hace el sistema. */
CREATE TABLE cambio_estado (
    id_cambio INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    id_estado_anterior INT,
    id_estado_nuevo INT NOT NULL,
    id_usuario INT,
    observacion VARCHAR(200),
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_cambio_estado PRIMARY KEY (id_cambio),

    CONSTRAINT fk_cambio_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_cambio_estado_anterior
        FOREIGN KEY (id_estado_anterior)
        REFERENCES estado_reserva(id_estado_reserva)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_cambio_estado_nuevo
        FOREIGN KEY (id_estado_nuevo)
        REFERENCES estado_reserva(id_estado_reserva)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_cambio_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE = InnoDB;

/* DECLARACIÓN DE APTITUD del pasajero (1 a 1 con la reserva).
   El triage de la IA asigna el nivel. */
CREATE TABLE declaracion_aptitud (
    id_declaracion INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    nivel_aptitud VARCHAR(20) NOT NULL,
    precauciones VARCHAR(500),
    fecha_evaluacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_declaracion_aptitud PRIMARY KEY (id_declaracion),
    CONSTRAINT uq_declaracion_reserva UNIQUE (id_reserva),

    CONSTRAINT fk_declaracion_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_declaracion_nivel
        CHECK (nivel_aptitud IN ('Apto', 'Apto con precaución', 'No apto'))
) ENGINE = InnoDB;

/* ÍNDICE DE VIABILIDAD: predicción de vuelo por clima (1 a muchos,
   porque se recalcula a medida que se acerca la fecha) */
CREATE TABLE indice_viabilidad (
    id_indice INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    nivel VARCHAR(15) NOT NULL,
    viento_kmh DECIMAL(5,2),
    rafagas_kmh DECIMAL(5,2),
    prob_precipitacion TINYINT,
    nubosidad TINYINT,
    visibilidad_km DECIMAL(5,2),
    temperatura_c DECIMAL(4,1),
    fuente VARCHAR(20) NOT NULL DEFAULT 'Open-Meteo',
    fecha_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_indice_viabilidad PRIMARY KEY (id_indice),

    CONSTRAINT fk_indice_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_indice_porcentaje
        CHECK (porcentaje BETWEEN 0 AND 100),
    CONSTRAINT ck_indice_nivel
        CHECK (nivel IN ('Recomendable', 'Con precaución', 'No recomendable')),
    CONSTRAINT ck_indice_viento
        CHECK ((viento_kmh IS NULL OR viento_kmh >= 0)
               AND (rafagas_kmh IS NULL OR rafagas_kmh >= 0)),
    CONSTRAINT ck_indice_precipitacion
        CHECK (prob_precipitacion IS NULL OR prob_precipitacion BETWEEN 0 AND 100),
    CONSTRAINT ck_indice_nubosidad
        CHECK (nubosidad IS NULL OR nubosidad BETWEEN 0 AND 100),
    CONSTRAINT ck_indice_visibilidad
        CHECK (visibilidad_km IS NULL OR visibilidad_km >= 0)
) ENGINE = InnoDB;

/* RESULTADO DEL VUELO (1 a 0..1) */
CREATE TABLE resultado_vuelo (
    id_resultado INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    ejecutado BOOLEAN NOT NULL,
    duracion_real_min SMALLINT,
    viento_despegue_kmh DECIMAL(5,2),
    motivo_no_realizado VARCHAR(200),
    observaciones VARCHAR(300),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_resultado_vuelo PRIMARY KEY (id_resultado),
    CONSTRAINT uq_resultado_reserva UNIQUE (id_reserva),

    CONSTRAINT fk_resultado_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_resultado_duracion
        CHECK (duracion_real_min IS NULL OR duracion_real_min > 0),
    CONSTRAINT ck_resultado_viento
        CHECK (viento_despegue_kmh IS NULL OR viento_despegue_kmh >= 0),
    /* Si el vuelo no se hizo, el motivo es obligatorio */
    CONSTRAINT ck_resultado_motivo
        CHECK (ejecutado = TRUE OR motivo_no_realizado IS NOT NULL)
) ENGINE = InnoDB;

/* PAGO: el cliente paga por WhatsApp y el administrador lo registra.
   Los pagos no se borran en cascada: son registros contables. */
CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    id_estado_pago INT NOT NULL,
    id_usuario INT,
    referencia VARCHAR(40) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    medio_pago VARCHAR(30),
    comprobante VARCHAR(100),
    fecha_pago DATETIME,
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_pago PRIMARY KEY (id_pago),

    CONSTRAINT fk_pago_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_estado
        FOREIGN KEY (id_estado_pago)
        REFERENCES estado_pago(id_estado_pago)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    /* Administrador que confirmó el pago */
    CONSTRAINT fk_pago_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_pago_valor
        CHECK (valor > 0),
    CONSTRAINT ck_pago_medio
        CHECK (medio_pago IS NULL
               OR medio_pago IN ('Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Tarjeta'))
) ENGINE = InnoDB;

/* CONVERSACIÓN con el copiloto de reservas (IA).
   id_reserva es opcional: la conversación empieza antes de reservar. */
CREATE TABLE conversacion (
    id_conversacion INT AUTO_INCREMENT,
    id_reserva INT,
    estado VARCHAR(15) NOT NULL DEFAULT 'Activa',
    escalada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,

    CONSTRAINT pk_conversacion PRIMARY KEY (id_conversacion),
    CONSTRAINT uq_conversacion_reserva UNIQUE (id_reserva),

    CONSTRAINT fk_conversacion_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_conversacion_estado
        CHECK (estado IN ('Activa', 'Cerrada', 'Escalada')),
    CONSTRAINT ck_conversacion_fechas
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE = InnoDB;

/* MENSAJE de una conversación */
CREATE TABLE mensaje_conversacion (
    id_mensaje INT AUTO_INCREMENT,
    id_conversacion INT NOT NULL,
    emisor VARCHAR(10) NOT NULL,
    contenido VARCHAR(1000) NOT NULL,
    fecha_mensaje DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_mensaje_conversacion PRIMARY KEY (id_mensaje),

    CONSTRAINT fk_mensaje_conversacion
        FOREIGN KEY (id_conversacion)
        REFERENCES conversacion(id_conversacion)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_mensaje_emisor
        CHECK (emisor IN ('Cliente', 'Asistente', 'Administrador')),
    CONSTRAINT ck_mensaje_contenido
        CHECK (CHAR_LENGTH(TRIM(contenido)) > 0)
) ENGINE = InnoDB;

/* ENCUESTA de satisfacción (1 a 0..1 con la reserva).
   La IA clasifica sentimiento y tema. */
CREATE TABLE encuesta (
    id_encuesta INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    id_resumen INT,
    token VARCHAR(64) NOT NULL,
    satisfaccion TINYINT,
    comentario VARCHAR(500),
    sentimiento VARCHAR(10),
    tema VARCHAR(60),
    fecha_respuesta DATETIME,

    CONSTRAINT pk_encuesta PRIMARY KEY (id_encuesta),
    CONSTRAINT uq_encuesta_reserva UNIQUE (id_reserva),
    CONSTRAINT uq_encuesta_token UNIQUE (token),

    CONSTRAINT fk_encuesta_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_encuesta_resumen
        FOREIGN KEY (id_resumen)
        REFERENCES resumen_percepcion(id_resumen)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ck_encuesta_satisfaccion
        CHECK (satisfaccion IS NULL OR satisfaccion BETWEEN 1 AND 5),
    CONSTRAINT ck_encuesta_sentimiento
        CHECK (sentimiento IS NULL OR sentimiento IN ('Positivo', 'Neutro', 'Negativo'))
) ENGINE = InnoDB;

/* NOTIFICACIÓN enviada por correo o WhatsApp */
CREATE TABLE notificacion (
    id_notificacion INT AUTO_INCREMENT,
    id_reserva INT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    destinatario VARCHAR(100) NOT NULL,
    asunto VARCHAR(120),
    estado_envio VARCHAR(15) NOT NULL DEFAULT 'Pendiente',
    intentos TINYINT NOT NULL DEFAULT 0,
    fecha_envio DATETIME,

    CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),

    CONSTRAINT fk_notificacion_reserva
        FOREIGN KEY (id_reserva)
        REFERENCES reserva(id_reserva)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT ck_notificacion_tipo
        CHECK (tipo IN ('Confirmación', 'Recordatorio', 'Cambio de estado',
                        'Alerta de clima', 'Encuesta', 'Pago')),
    CONSTRAINT ck_notificacion_estado
        CHECK (estado_envio IN ('Pendiente', 'Enviada', 'Fallida')),
    CONSTRAINT ck_notificacion_intentos
        CHECK (intentos BETWEEN 0 AND 5)
) ENGINE = InnoDB;

/* ========================================================
6. TABLA ASOCIATIVA: DECLARACIÓN - CONDICIÓN
Relación muchos a muchos entre la declaración de aptitud
y las condiciones de salud. PK compuesta por las dos FK.
======================================================== */

CREATE TABLE declaracion_condicion (
    id_declaracion INT NOT NULL,
    id_condicion INT NOT NULL,

    CONSTRAINT pk_declaracion_condicion
        PRIMARY KEY (id_declaracion, id_condicion),

    CONSTRAINT fk_declcond_declaracion
        FOREIGN KEY (id_declaracion)
        REFERENCES declaracion_aptitud(id_declaracion)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_declcond_condicion
        FOREIGN KEY (id_condicion)
        REFERENCES condicion_salud(id_condicion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

/* ========================================================
7. ÍNDICES
InnoDB crea índices automáticamente para PK, UNIQUE y para
cada FK que no tenga uno. Estos índices adicionales cubren
búsquedas frecuentes por columnas que NO son llaves.
======================================================== */

/* Agenda del día y control de cupo por bloque */
CREATE INDEX idx_reserva_fecha_bloque
    ON reserva(fecha_vuelo, id_bloque);

/* Búsqueda de clientes por correo */
CREATE INDEX idx_cliente_correo
    ON cliente(correo);

/* Búsqueda de pagos por referencia (código de la reserva) */
CREATE INDEX idx_pago_referencia
    ON pago(referencia);

/* Historial de estados ordenado por fecha */
CREATE INDEX idx_cambio_reserva_fecha
    ON cambio_estado(id_reserva, fecha_cambio);

/* Último índice de viabilidad calculado */
CREATE INDEX idx_indice_reserva_fecha
    ON indice_viabilidad(id_reserva, fecha_calculo);

/* Reintentos de notificaciones pendientes o fallidas */
CREATE INDEX idx_notificacion_estado
    ON notificacion(estado_envio);

/* Equipos con revisión próxima a vencer */
CREATE INDEX idx_equipo_proxima_revision
    ON equipo_vuelo(fecha_proxima_revision);

/* ========================================================
8. DATOS DE PRUEBA
======================================================== */

/* Catálogos */
INSERT INTO rol (nombre_rol, descripcion) VALUES
('Administrador', 'Acceso total al panel; crea administradores y pilotos'),
('Piloto', 'Consulta su agenda y registra resultados de vuelo'),
('Cliente', 'Consulta su historial de vuelos y sus reservas');

INSERT INTO estado_reserva (nombre_estado, descripcion) VALUES
('Pendiente', 'Creada, a la espera del pago por WhatsApp'),
('Confirmada', 'Pago confirmado por el administrador, falta asignar piloto y equipo'),
('Asignada', 'Tiene piloto y equipo asignados'),
('Ejecutada', 'El vuelo se realizó'),
('Cancelada', 'Cancelada por el cliente o por la operación'),
('Expirada', 'No se pagó antes de la fecha de expiración');

INSERT INTO estado_pago (nombre_estado, descripcion) VALUES
('Pendiente', 'El cliente aún no envía el comprobante por WhatsApp'),
('Aprobado', 'El administrador verificó el pago'),
('Rechazado', 'El comprobante no corresponde o no se recibió el dinero'),
('Reembolsado', 'Se devolvió el dinero al cliente');

INSERT INTO condicion_salud (nombre, descripcion, efecto) VALUES
('Ninguna', 'El pasajero no reporta condiciones', 'Informativa'),
('Hipertensión controlada', 'Presión arterial tratada con medicamento', 'Precaución'),
('Lesión de rodilla o tobillo', 'Afecta la carrera de despegue y el aterrizaje', 'Precaución'),
('Embarazo', 'No se permite volar en estado de embarazo', 'Excluyente'),
('Cirugía reciente', 'Cirugía en los últimos tres meses', 'Excluyente');

/* Bloques de 30 minutos de 09:00 a 16:30 con 5 cupos (igual que la página) */
INSERT INTO bloque_horario (hora_inicio, hora_fin, cupo_maximo) VALUES
('09:00:00', '09:30:00', 5),
('09:30:00', '10:00:00', 5),
('10:00:00', '10:30:00', 5),
('10:30:00', '11:00:00', 5),
('11:00:00', '11:30:00', 5),
('11:30:00', '12:00:00', 5),
('12:00:00', '12:30:00', 5),
('12:30:00', '13:00:00', 5),
('13:00:00', '13:30:00', 5),
('13:30:00', '14:00:00', 5),
('14:00:00', '14:30:00', 5),
('14:30:00', '15:00:00', 5),
('15:00:00', '15:30:00', 5),
('15:30:00', '16:00:00', 5),
('16:00:00', '16:30:00', 5);

INSERT INTO servicio_vuelo (titulo, descripcion, precio, duracion_minutos) VALUES
('Vuelo Clásico', 'Vuelo biplaza con piloto certificado', 250000, 15),
('Vuelo Extendido', 'Vuelo biplaza de mayor duración con video', 350000, 25),
('Vuelo Acrobático', 'Vuelo biplaza con maniobras', 450000, 20);

INSERT INTO equipo_vuelo
(identificador, marca, modelo, tipo, peso_minimo, peso_maximo,
 fecha_ultima_revision, fecha_proxima_revision, estado)
VALUES
('EQ-001', 'Ozone', 'Magnum 3', 'Biplaza', 110, 220, '2026-06-10', '2026-12-10', 'Disponible'),
('EQ-002', 'Gin', 'Fuse 3', 'Biplaza', 120, 225, '2026-08-01', '2027-02-01', 'Disponible'),
('EQ-003', 'Advance', 'Bi Beta 6', 'Biplaza', 110, 210, '2026-04-15', '2026-10-15', 'En mantenimiento');

/* Usuarios: 2 administradores, 2 pilotos y 1 cliente con cuenta.
   Contraseña de prueba de todos: FlyAdventure2026*  (hash BCrypt, costo 10).
   Solo para el ambiente local: cámbiela antes de cualquier despliegue. */
INSERT INTO usuario
(id_rol, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, contrasena_hash)
VALUES
(1, 'CC', '1001001001', 'Andrea', 'Mejía', 'admin@flyadventure.com', '3001112233', '$2b$10$OkOq4JKO2v1e6q1LT0FcHOT5tuECUPp.bHKUqggGe5FH/DSjDquuS'),
(1, 'CC', '1002002002', 'Santiago', 'Ríos', 'santiago.admin@flyadventure.com', '3002223344', '$2b$10$OkOq4JKO2v1e6q1LT0FcHOT5tuECUPp.bHKUqggGe5FH/DSjDquuS'),
(2, 'CC', '1003003003', 'Mateo', 'Gil', 'mateo.piloto@flyadventure.com', '3003334455', '$2b$10$OkOq4JKO2v1e6q1LT0FcHOT5tuECUPp.bHKUqggGe5FH/DSjDquuS'),
(2, 'CC', '1004004004', 'Valeria', 'Ochoa', 'valeria.piloto@flyadventure.com', '3004445566', '$2b$10$OkOq4JKO2v1e6q1LT0FcHOT5tuECUPp.bHKUqggGe5FH/DSjDquuS'),
(3, 'CC', '1036111222', 'Ana', 'Gómez', 'ana@correo.com', '3101112233', '$2b$10$OkOq4JKO2v1e6q1LT0FcHOT5tuECUPp.bHKUqggGe5FH/DSjDquuS');

INSERT INTO piloto
(id_usuario, numero_licencia, nivel_certificacion, fecha_venc_certificacion, horas_vuelo, peso_kg)
VALUES
(3, 'LIC-FCV-0451', 'Instructor', '2027-05-30', 1850, 78),
(4, 'LIC-FCV-0782', 'Piloto biplaza', '2026-11-20', 620, 62);

INSERT INTO parametro_operacion (id_usuario, clave, valor, descripcion) VALUES
(1, 'peso_maximo_pasajero', '110', 'Peso máximo del pasajero en kg'),
(1, 'edad_minima_pasajero', '6', 'Edad mínima para volar'),
(1, 'viento_maximo_kmh', '25', 'Viento máximo permitido para despegar'),
(1, 'minutos_expiracion', '30', 'Minutos para pagar antes de que la reserva expire');

INSERT INTO disponibilidad_piloto (id_piloto, id_bloque, fecha) VALUES
(1, 1, '2026-10-24'),
(1, 2, '2026-10-24'),
(2, 1, '2026-10-24'),
(2, 11, '2026-10-24');

/* Clientes (todos autorizan el tratamiento de datos).
   Ana tiene cuenta (usuario 5); Carlos y Laura reservaron como invitados. */
INSERT INTO cliente
(id_usuario, tipo_documento, numero_documento, nombres, apellidos, correo, telefono,
 fecha_nacimiento, contacto_emergencia, telefono_emergencia,
 autoriza_datos, fecha_autorizacion)
VALUES
(5, 'CC', '1036111222', 'Ana', 'Gómez', 'ana@correo.com', '3101112233',
 '1998-04-12', 'Luis Gómez', '3109998877', TRUE, '2026-10-10 10:00:00'),
(NULL, 'CC', '1036333444', 'Carlos', 'Pérez', 'carlos@correo.com', '3112223344',
 '1990-09-20', NULL, NULL, TRUE, '2026-10-11 15:30:00'),
(NULL, 'PA', 'AB1234567', 'Laura', 'Smith', 'laura@correo.com', '3123334455',
 '2001-01-15', 'John Smith', '3128887766', TRUE, '2026-10-12 09:15:00');

/* Reservas */
INSERT INTO reserva
(codigo, id_cliente, id_servicio, id_bloque, id_estado_reserva, fecha_vuelo,
 peso_pasajero, edad_pasajero, valor_total, canal, acepta_terminos,
 fecha_creacion, fecha_expiracion)
VALUES
('FA-2026-0001', 1, 1, 1, 4, '2026-10-12', 58, 28, 250000, 'Web', TRUE,
 '2026-10-10 10:05:00', '2026-10-10 10:35:00'),
('FA-2026-0002', 2, 2, 2, 3, '2026-10-24', 85, 36, 350000, 'Asistente IA', TRUE,
 '2026-10-11 15:35:00', '2026-10-11 16:05:00'),
('FA-2026-0003', 3, 3, 11, 1, '2026-10-24', 64, 25, 450000, 'WhatsApp', TRUE,
 '2026-10-12 09:20:00', '2026-10-12 09:50:00');

/* Historial de estados */
INSERT INTO cambio_estado
(id_reserva, id_estado_anterior, id_estado_nuevo, id_usuario, observacion, fecha_cambio)
VALUES
(1, NULL, 1, NULL, 'Reserva creada desde la web', '2026-10-10 10:05:00'),
(1, 1, 2, 1, 'Pago confirmado por WhatsApp', '2026-10-10 10:12:00'),
(1, 2, 3, 2, 'Asignación aprobada', '2026-10-10 11:00:00'),
(1, 3, 4, 4, 'Vuelo realizado', '2026-10-12 08:40:00'),
(2, NULL, 1, NULL, 'Reserva creada por el asistente', '2026-10-11 15:35:00'),
(2, 1, 2, 1, 'Pago confirmado por WhatsApp', '2026-10-11 15:50:00'),
(2, 2, 3, 2, 'Asignación aprobada con ajuste manual', '2026-10-12 08:00:00'),
(3, NULL, 1, 2, 'Reserva registrada desde WhatsApp', '2026-10-12 09:20:00');

/* Triage de aptitud */
INSERT INTO declaracion_aptitud (id_reserva, nivel_aptitud, precauciones) VALUES
(1, 'Apto', NULL),
(2, 'Apto con precaución', 'Aterrizaje sentado por lesión de rodilla'),
(3, 'Apto', NULL);

INSERT INTO declaracion_condicion (id_declaracion, id_condicion) VALUES
(1, 1),
(2, 3),
(3, 1);

/* Motor predictivo de viabilidad */
INSERT INTO indice_viabilidad
(id_reserva, porcentaje, nivel, viento_kmh, rafagas_kmh, prob_precipitacion,
 nubosidad, visibilidad_km, temperatura_c, fecha_calculo)
VALUES
(1, 88.50, 'Recomendable', 12.0, 18.0, 10, 30, 10.0, 21.5, '2026-10-11 18:00:00'),
(2, 64.00, 'Con precaución', 18.0, 27.0, 35, 60, 8.0, 19.0, '2026-10-12 18:00:00'),
(2, 71.25, 'Con precaución', 16.0, 24.0, 25, 50, 9.0, 20.0, '2026-10-13 18:00:00'),
(3, 92.00, 'Recomendable', 9.0, 14.0, 5, 20, 10.0, 23.0, '2026-10-13 18:00:00');

/* Asignación inteligente piloto-equipo */
INSERT INTO asignacion
(id_reserva, id_piloto, id_equipo, id_usuario, puntaje, recomendada_ia, explicacion, justificacion)
VALUES
(1, 2, 1, 2, 91.00, TRUE,
 'Peso combinado 120 kg dentro del rango del equipo y piloto disponible', NULL),
(2, 1, 2, 2, 84.50, FALSE,
 'La IA sugirió a la piloto 2 con el equipo EQ-001',
 'Se asigna el instructor por la precaución de aterrizaje');

/* Pagos acordados por WhatsApp y confirmados por un administrador */
INSERT INTO pago
(id_reserva, id_estado_pago, id_usuario, referencia, valor, medio_pago, comprobante, fecha_pago)
VALUES
(1, 2, 1, 'FA-2026-0001', 250000, 'Nequi', 'Captura enviada por WhatsApp', '2026-10-10 10:12:00'),
(2, 2, 1, 'FA-2026-0002', 350000, 'Transferencia', 'Comprobante Bancolombia', '2026-10-11 15:50:00'),
(3, 1, NULL, 'FA-2026-0003', 450000, NULL, NULL, NULL);

/* Resultado del vuelo realizado */
INSERT INTO resultado_vuelo
(id_reserva, ejecutado, duracion_real_min, viento_despegue_kmh, observaciones)
VALUES
(1, TRUE, 17, 11.5, 'Vuelo sin novedades');

/* Copiloto conversacional de reservas */
INSERT INTO conversacion (id_reserva, estado, escalada, fecha_inicio, fecha_fin) VALUES
(2, 'Cerrada', FALSE, '2026-10-11 15:25:00', '2026-10-11 15:36:00'),
(NULL, 'Escalada', TRUE, '2026-10-13 17:00:00', NULL);

INSERT INTO mensaje_conversacion (id_conversacion, emisor, contenido, fecha_mensaje) VALUES
(1, 'Cliente', 'Quiero volar el 24 de octubre en la mañana', '2026-10-11 15:25:00'),
(1, 'Asistente', 'Hay cupo de 9:30 a 10:00. ¿Te reservo el Vuelo Extendido?', '2026-10-11 15:25:10'),
(1, 'Cliente', 'Sí, por favor', '2026-10-11 15:26:00'),
(2, 'Cliente', '¿Puedo volar si estoy embarazada?', '2026-10-13 17:00:00'),
(2, 'Asistente', 'Te comunico con un asesor de FlyAdventure por WhatsApp', '2026-10-13 17:00:08');

/* Encuestas y análisis de sentimiento */
INSERT INTO resumen_percepcion
(periodo_inicio, periodo_fin, total_respuestas, porcentaje_satisfaccion, temas_recurrentes, resumen)
VALUES
('2026-10-01', '2026-10-15', 1, 100.00, 'Atención del piloto',
 'Los clientes destacan la seguridad y la atención del piloto');

INSERT INTO encuesta
(id_reserva, id_resumen, token, satisfaccion, comentario, sentimiento, tema, fecha_respuesta)
VALUES
(1, 1, 'tok-7f3a9c1e2b4d', 5, 'Excelente experiencia, la piloto muy profesional',
 'Positivo', 'Atención del piloto', '2026-10-12 19:00:00');

/* Notificaciones */
INSERT INTO notificacion
(id_reserva, tipo, destinatario, asunto, estado_envio, intentos, fecha_envio)
VALUES
(1, 'Confirmación', 'ana@correo.com', 'Tu vuelo está confirmado', 'Enviada', 1, '2026-10-10 10:13:00'),
(1, 'Encuesta', 'ana@correo.com', '¿Cómo te fue en tu vuelo?', 'Enviada', 1, '2026-10-12 12:00:00'),
(2, 'Confirmación', 'carlos@correo.com', 'Tu vuelo está confirmado', 'Enviada', 1, '2026-10-11 15:51:00'),
(2, 'Alerta de clima', 'carlos@correo.com', 'Posible viento fuerte el día de tu vuelo', 'Fallida', 3, NULL),
(3, 'Pago', 'laura@correo.com', 'Completa tu pago por WhatsApp', 'Pendiente', 0, NULL);

/* Analista conversacional del panel */
INSERT INTO consulta_analitica
(id_usuario, pregunta, consulta_generada, respuesta, tipo_grafico)
VALUES
(1, '¿Cuánto se recaudó por servicio este mes?',
 'SELECT s.titulo, SUM(p.valor) FROM pago p JOIN reserva r ... GROUP BY s.titulo',
 'Vuelo Extendido: $350.000; Vuelo Clásico: $250.000', 'Barras');

/* ========================================================
9. CONSULTAS PARA DEMOSTRAR EL MODELO
======================================================== */

/* Agenda de vuelos: reserva, cliente, servicio, bloque, piloto y equipo */
SELECT
    r.codigo,
    r.fecha_vuelo,
    CONCAT(b.hora_inicio, ' - ', b.hora_fin) AS bloque,
    CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
    s.titulo AS servicio,
    er.nombre_estado AS estado,
    CONCAT(u.nombres, ' ', u.apellidos) AS piloto,
    e.identificador AS equipo
FROM reserva r
JOIN cliente c ON c.id_cliente = r.id_cliente
JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
JOIN bloque_horario b ON b.id_bloque = r.id_bloque
JOIN estado_reserva er ON er.id_estado_reserva = r.id_estado_reserva
LEFT JOIN asignacion a ON a.id_reserva = r.id_reserva
LEFT JOIN piloto pi ON pi.id_piloto = a.id_piloto
LEFT JOIN usuario u ON u.id_usuario = pi.id_usuario
LEFT JOIN equipo_vuelo e ON e.id_equipo = a.id_equipo
ORDER BY r.fecha_vuelo, b.hora_inicio;

/* Cupo disponible por bloque para una fecha */
SELECT
    b.id_bloque,
    CONCAT(b.hora_inicio, ' - ', b.hora_fin) AS bloque,
    b.cupo_maximo,
    COUNT(r.id_reserva) AS reservados,
    b.cupo_maximo - COUNT(r.id_reserva) AS disponibles
FROM bloque_horario b
LEFT JOIN reserva r
    ON r.id_bloque = b.id_bloque
   AND r.fecha_vuelo = '2026-10-24'
   AND r.id_estado_reserva NOT IN (5, 6)   -- excluye Cancelada y Expirada
WHERE b.activo = TRUE
GROUP BY b.id_bloque, b.hora_inicio, b.hora_fin, b.cupo_maximo
ORDER BY b.hora_inicio;

/* Ingresos aprobados por servicio */
SELECT
    s.titulo AS servicio,
    COUNT(p.id_pago) AS pagos_aprobados,
    SUM(p.valor) AS total_recaudado
FROM pago p
JOIN estado_pago ep ON ep.id_estado_pago = p.id_estado_pago
JOIN reserva r ON r.id_reserva = p.id_reserva
JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
WHERE ep.nombre_estado = 'Aprobado'
GROUP BY s.id_servicio, s.titulo
ORDER BY total_recaudado DESC;

/* Historial de estados de una reserva */
SELECT
    r.codigo,
    ea.nombre_estado AS estado_anterior,
    en.nombre_estado AS estado_nuevo,
    COALESCE(CONCAT(u.nombres, ' ', u.apellidos), 'Sistema') AS registrado_por,
    ce.observacion,
    ce.fecha_cambio
FROM cambio_estado ce
JOIN reserva r ON r.id_reserva = ce.id_reserva
LEFT JOIN estado_reserva ea ON ea.id_estado_reserva = ce.id_estado_anterior
JOIN estado_reserva en ON en.id_estado_reserva = ce.id_estado_nuevo
LEFT JOIN usuario u ON u.id_usuario = ce.id_usuario
WHERE r.codigo = 'FA-2026-0001'
ORDER BY ce.fecha_cambio;

/* Último índice de viabilidad de cada reserva */
SELECT
    r.codigo,
    r.fecha_vuelo,
    iv.porcentaje,
    iv.nivel,
    iv.viento_kmh,
    iv.fecha_calculo
FROM indice_viabilidad iv
JOIN reserva r ON r.id_reserva = iv.id_reserva
WHERE iv.fecha_calculo = (
    SELECT MAX(i2.fecha_calculo)
    FROM indice_viabilidad i2
    WHERE i2.id_reserva = iv.id_reserva
)
ORDER BY r.fecha_vuelo;

/* Asignaciones en las que el administrador no siguió a la IA */
SELECT
    r.codigo,
    a.puntaje,
    a.explicacion,
    a.justificacion
FROM asignacion a
JOIN reserva r ON r.id_reserva = a.id_reserva
WHERE a.recomendada_ia = FALSE;

/* Historial de vuelos de un cliente con cuenta (vista "Mi cuenta") */
SELECT
    r.codigo,
    r.fecha_vuelo,
    CONCAT(b.hora_inicio, ' - ', b.hora_fin) AS bloque,
    s.titulo AS servicio,
    er.nombre_estado AS estado,
    e.satisfaccion
FROM usuario u
JOIN cliente c ON c.id_usuario = u.id_usuario
JOIN reserva r ON r.id_cliente = c.id_cliente
JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
JOIN bloque_horario b ON b.id_bloque = r.id_bloque
JOIN estado_reserva er ON er.id_estado_reserva = r.id_estado_reserva
LEFT JOIN encuesta e ON e.id_reserva = r.id_reserva
WHERE u.correo = 'ana@correo.com'
ORDER BY r.fecha_vuelo DESC;

/* Usuarios por rol */
SELECT ro.nombre_rol, COUNT(u.id_usuario) AS usuarios
FROM rol ro
LEFT JOIN usuario u ON u.id_rol = ro.id_rol
GROUP BY ro.id_rol, ro.nombre_rol;

/* Pilotos con certificación o equipos con revisión por vencer (60 días) */
SELECT 'Piloto' AS tipo, p.numero_licencia AS identificador,
       p.fecha_venc_certificacion AS vence
FROM piloto p
WHERE p.fecha_venc_certificacion <= CURDATE() + INTERVAL 60 DAY
UNION ALL
SELECT 'Equipo', e.identificador, e.fecha_proxima_revision
FROM equipo_vuelo e
WHERE e.fecha_proxima_revision <= CURDATE() + INTERVAL 60 DAY
ORDER BY vence;

/* ========================================================
10. PRUEBAS DE RESTRICCIONES
Ejecutar de manera individual para observar los errores
de integridad de MySQL.
======================================================== */

/*
-- Debe fallar: precio en cero (CHECK ck_servicio_precio).
INSERT INTO servicio_vuelo (titulo, precio, duracion_minutos)
VALUES ('Vuelo gratis', 0, 15);

-- Debe fallar: satisfacción fuera de 1 a 5 (CHECK ck_encuesta_satisfaccion).
INSERT INTO encuesta (id_reserva, token, satisfaccion)
VALUES (2, 'tok-prueba-001', 8);

-- Debe fallar: cliente sin autorización de datos (habeas data).
INSERT INTO cliente
(tipo_documento, numero_documento, nombres, apellidos, correo, telefono,
 fecha_nacimiento, autoriza_datos, fecha_autorizacion)
VALUES ('CC', '999', 'Pedro', 'Ruiz', 'pedro@correo.com', '3000000000',
 '1995-05-05', FALSE, NOW());

-- Debe fallar: reserva con cliente inexistente (FK fk_reserva_cliente).
INSERT INTO reserva
(codigo, id_cliente, id_servicio, id_bloque, id_estado_reserva, fecha_vuelo,
 peso_pasajero, edad_pasajero, valor_total, acepta_terminos)
VALUES ('FA-2026-9999', 999, 1, 1, 1, '2026-11-01', 70, 30, 250000, TRUE);

-- Debe fallar: segunda asignación para la misma reserva (UNIQUE uq_asignacion_reserva).
INSERT INTO asignacion (id_reserva, id_piloto, id_equipo, id_usuario, recomendada_ia)
VALUES (1, 1, 2, 2, TRUE);

-- Debe fallar: no siguió a la IA y no justificó (CHECK ck_asignacion_justificacion).
INSERT INTO asignacion (id_reserva, id_piloto, id_equipo, id_usuario, recomendada_ia)
VALUES (3, 1, 2, 2, FALSE);

-- Debe fallar: vuelo no realizado sin motivo (CHECK ck_resultado_motivo).
INSERT INTO resultado_vuelo (id_reserva, ejecutado)
VALUES (2, FALSE);

-- Debe fallar: equipo con peso máximo menor al mínimo (CHECK ck_equipo_pesos).
INSERT INTO equipo_vuelo
(identificador, marca, modelo, tipo, peso_minimo, peso_maximo,
 fecha_ultima_revision, fecha_proxima_revision)
VALUES ('EQ-999', 'Ozone', 'Prueba', 'Biplaza', 200, 100, '2026-01-01', '2026-07-01');

-- Debe fallar: una misma cuenta enlazada a dos clientes (UNIQUE uq_cliente_usuario).
UPDATE cliente SET id_usuario = 5 WHERE id_cliente = 2;

-- Debe fallar: medio de pago no permitido (CHECK ck_pago_medio).
INSERT INTO pago (id_reserva, id_estado_pago, referencia, valor, medio_pago)
VALUES (3, 1, 'FA-2026-0003', 450000, 'Bitcoin');

-- Debe fallar: borrar una reserva que tiene pagos (FK fk_pago_reserva, RESTRICT).
DELETE FROM reserva WHERE id_reserva = 1;
*/

/*
===========================================================
IDEA CLAVE

MER (26 entidades)
   ↓
Catálogos → Tablas principales → Tablas dependientes → Asociativas
   ↓
PK (AUTO_INCREMENT) y UNIQUE (cardinalidades 1 a 1)
   ↓
FK con ON UPDATE CASCADE y ON DELETE RESTRICT / CASCADE / SET NULL
   ↓
CHECK: reglas de dominio y de negocio
   ↓
SQL MySQL
   ↓
Datos + consultas + pruebas

Notas de MySQL frente a PostgreSQL:
- MySQL usa AUTO_INCREMENT en lugar de GENERATED ALWAYS AS IDENTITY.
- Los CHECK solo se validan desde MySQL 8.0.16.
- Un CHECK no puede usar funciones como CURDATE(), por eso
  "fecha_nacimiento <= hoy" se valida en la aplicación o con un trigger.
- BOOLEAN en MySQL es un alias de TINYINT(1).
===========================================================
*/
