// Catálogo de servicios de vuelo (RF001 y RF002).
import { consultar } from '../config/db.js';
import { conflicto, noEncontrado } from '../utils/errores.js';
import { exigirCampos, texto, validarEntero, validarNumero } from '../utils/validacion.js';

const aServicio = (f) => ({
  id: f.id_servicio,
  titulo: f.titulo,
  descripcion: f.descripcion,
  precio: Number(f.precio),
  duracionMinutos: f.duracion_minutos,
  imagen: f.imagen_url,
  activo: Boolean(f.activo)
});

export const listarServicios = async ({ incluirInactivos = false } = {}) => {
  const filas = await consultar(
    `SELECT * FROM servicio_vuelo ${incluirInactivos ? '' : 'WHERE activo = TRUE'} ORDER BY precio`
  );
  return filas.map(aServicio);
};

export const obtenerServicio = async (id) => {
  const [fila] = await consultar('SELECT * FROM servicio_vuelo WHERE id_servicio = ?', [id]);
  if (!fila) throw noEncontrado('El servicio no existe');
  return aServicio(fila);
};

const validarServicio = (cuerpo) => {
  exigirCampos(cuerpo, ['titulo', 'precio']);
  return {
    titulo: texto(cuerpo.titulo).slice(0, 80),
    descripcion: texto(cuerpo.descripcion).slice(0, 500) || null,
    precio: validarNumero(cuerpo.precio, 'precio', { min: 1, max: 99999999 }),
    duracionMinutos: validarEntero(cuerpo.duracionMinutos ?? 15, 'duracionMinutos', { min: 5, max: 240 }),
    imagen: texto(cuerpo.imagen).slice(0, 255) || null,
    activo: cuerpo.activo === undefined ? true : Boolean(cuerpo.activo)
  };
};

const traducirDuplicado = (error) => {
  if (error.code === 'ER_DUP_ENTRY') throw conflicto('Ya existe un servicio con ese título');
  throw error;
};

export const crearServicio = async (cuerpo) => {
  const s = validarServicio(cuerpo);
  const resultado = await consultar(
    `INSERT INTO servicio_vuelo (titulo, descripcion, precio, duracion_minutos, imagen_url, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [s.titulo, s.descripcion, s.precio, s.duracionMinutos, s.imagen, s.activo]
  ).catch(traducirDuplicado);
  return obtenerServicio(resultado.insertId);
};

export const actualizarServicio = async (id, cuerpo) => {
  await obtenerServicio(id);
  const s = validarServicio(cuerpo);
  await consultar(
    `UPDATE servicio_vuelo
     SET titulo = ?, descripcion = ?, precio = ?, duracion_minutos = ?, imagen_url = ?, activo = ?
     WHERE id_servicio = ?`,
    [s.titulo, s.descripcion, s.precio, s.duracionMinutos, s.imagen, s.activo, id]
  ).catch(traducirDuplicado);
  return obtenerServicio(id);
};

export const cambiarActivoServicio = async (id, activo) => {
  await obtenerServicio(id);
  await consultar('UPDATE servicio_vuelo SET activo = ? WHERE id_servicio = ?', [Boolean(activo), id]);
  return obtenerServicio(id);
};

export const eliminarServicio = async (id) => {
  await obtenerServicio(id);
  try {
    await consultar('DELETE FROM servicio_vuelo WHERE id_servicio = ?', [id]);
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw conflicto('El servicio tiene reservas asociadas. Ocúltelo en lugar de eliminarlo.');
    }
    throw error;
  }
};
