import { api } from './api';

export const obtenerRecomendacion = (idReserva) => api.get(`/asignaciones/recomendacion/${idReserva}`);
export const crearAsignacion = ({ idReserva, idPiloto, idEquipo, justificacion }) =>
  api.post('/asignaciones', { idReserva, idPiloto, idEquipo, justificacion });
