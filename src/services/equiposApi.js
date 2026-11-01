import { api } from './api';

export const ESTADOS_EQUIPO = ['Disponible', 'En mantenimiento', 'Fuera de servicio'];
export const TIPOS_EQUIPO = ['Biplaza', 'Monoplaza'];

export const listarEquipos = (estado) => api.get(estado ? `/equipos?estado=${encodeURIComponent(estado)}` : '/equipos');
export const crearEquipo = (datos) => api.post('/equipos', datos);
export const actualizarEquipo = (id, datos) => api.put(`/equipos/${id}`, datos);
export const cambiarEstadoEquipo = (id, estado) => api.patch(`/equipos/${id}/estado`, { estado });

/** Guarda el equipo: crea si no tiene id, actualiza si ya existe. */
export const guardarEquipo = ({ id, ...datos }) => {
  const cuerpo = { ...datos, pesoMinimo: Number(datos.pesoMinimo), pesoMaximo: Number(datos.pesoMaximo) };
  return id ? actualizarEquipo(id, cuerpo) : crearEquipo(cuerpo);
};
