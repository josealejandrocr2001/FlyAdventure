// Equipos de vuelo: parapentes biplaza y monoplaza (RF011, HU012).
import { consultar } from '../config/db.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../utils/errores.js';
import { exigirCampos, texto, validarFecha, validarNumero } from '../utils/validacion.js';

export const ESTADOS_EQUIPO = ['Disponible', 'En mantenimiento', 'Fuera de servicio'];
export const TIPOS_EQUIPO = ['Biplaza', 'Monoplaza'];

const aEquipo = (f) => ({
  id: f.id_equipo,
  identificador: f.identificador,
  marca: f.marca,
  modelo: f.modelo,
  tipo: f.tipo,
  pesoMinimo: Number(f.peso_minimo),
  pesoMaximo: Number(f.peso_maximo),
  fechaUltimaRevision: f.fecha_ultima_revision,
  fechaProximaRevision: f.fecha_proxima_revision,
  estado: f.estado
});

/** Lista todos los equipos. Filtro opcional por estado (?estado=Disponible). */
export const listarEquipos = async ({ estado } = {}) => {
  if (estado && !ESTADOS_EQUIPO.includes(estado)) {
    throw solicitudInvalida(`Estado inválido. Use: ${ESTADOS_EQUIPO.join(', ')}`);
  }
  const filas = estado
    ? await consultar('SELECT * FROM equipo_vuelo WHERE estado = ? ORDER BY identificador', [estado])
    : await consultar('SELECT * FROM equipo_vuelo ORDER BY identificador');
  return filas.map(aEquipo);
};

export const obtenerEquipo = async (id) => {
  const [fila] = await consultar('SELECT * FROM equipo_vuelo WHERE id_equipo = ?', [id]);
  if (!fila) throw noEncontrado('El equipo no existe');
  return aEquipo(fila);
};

const validarEstado = (estado) => {
  const valor = texto(estado);
  if (!ESTADOS_EQUIPO.includes(valor)) {
    throw solicitudInvalida(`Estado inválido. Use: ${ESTADOS_EQUIPO.join(', ')}`);
  }
  return valor;
};

const validarEquipo = (cuerpo) => {
  exigirCampos(cuerpo, [
    'identificador', 'marca', 'modelo', 'tipo', 'pesoMinimo', 'pesoMaximo',
    'fechaUltimaRevision', 'fechaProximaRevision'
  ]);

  const tipo = texto(cuerpo.tipo);
  if (!TIPOS_EQUIPO.includes(tipo)) {
    throw solicitudInvalida(`Tipo inválido. Use: ${TIPOS_EQUIPO.join(', ')}`);
  }

  const pesoMinimo = validarNumero(cuerpo.pesoMinimo, 'pesoMinimo', { min: 1, max: 999 });
  const pesoMaximo = validarNumero(cuerpo.pesoMaximo, 'pesoMaximo', { min: 1, max: 999 });
  if (pesoMaximo <= pesoMinimo) {
    throw solicitudInvalida('El peso máximo debe ser mayor que el peso mínimo');
  }

  const fechaUltimaRevision = validarFecha(cuerpo.fechaUltimaRevision, 'fechaUltimaRevision');
  const fechaProximaRevision = validarFecha(cuerpo.fechaProximaRevision, 'fechaProximaRevision');
  if (fechaProximaRevision <= fechaUltimaRevision) {
    throw solicitudInvalida('La próxima revisión debe ser posterior a la última revisión');
  }

  return {
    identificador: texto(cuerpo.identificador).toUpperCase().slice(0, 20),
    marca: texto(cuerpo.marca).slice(0, 40),
    modelo: texto(cuerpo.modelo).slice(0, 40),
    tipo,
    pesoMinimo,
    pesoMaximo,
    fechaUltimaRevision,
    fechaProximaRevision,
    estado: cuerpo.estado === undefined ? 'Disponible' : validarEstado(cuerpo.estado)
  };
};

const traducirDuplicado = (error) => {
  if (error.code === 'ER_DUP_ENTRY') throw conflicto('Ya existe un equipo con ese identificador');
  throw error;
};

export const crearEquipo = async (cuerpo) => {
  const e = validarEquipo(cuerpo);
  const resultado = await consultar(
    `INSERT INTO equipo_vuelo
       (identificador, marca, modelo, tipo, peso_minimo, peso_maximo,
        fecha_ultima_revision, fecha_proxima_revision, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.identificador, e.marca, e.modelo, e.tipo, e.pesoMinimo, e.pesoMaximo,
      e.fechaUltimaRevision, e.fechaProximaRevision, e.estado]
  ).catch(traducirDuplicado);
  return obtenerEquipo(resultado.insertId);
};

export const actualizarEquipo = async (id, cuerpo) => {
  await obtenerEquipo(id);
  const e = validarEquipo(cuerpo);
  await consultar(
    `UPDATE equipo_vuelo
     SET identificador = ?, marca = ?, modelo = ?, tipo = ?, peso_minimo = ?, peso_maximo = ?,
         fecha_ultima_revision = ?, fecha_proxima_revision = ?, estado = ?
     WHERE id_equipo = ?`,
    [e.identificador, e.marca, e.modelo, e.tipo, e.pesoMinimo, e.pesoMaximo,
      e.fechaUltimaRevision, e.fechaProximaRevision, e.estado, id]
  ).catch(traducirDuplicado);
  return obtenerEquipo(id);
};

/** Cambia solo el estado (Disponible, En mantenimiento, Fuera de servicio). */
export const cambiarEstadoEquipo = async (id, estado) => {
  await obtenerEquipo(id);
  await consultar('UPDATE equipo_vuelo SET estado = ? WHERE id_equipo = ?', [validarEstado(estado), id]);
  return obtenerEquipo(id);
};
