import { api } from './api';

export const NIVELES_PILOTO = ['Piloto biplaza', 'Instructor', 'Instructor examinador'];

// ---- Administrador: ficha y disponibilidad ----
export const listarPilotos = () => api.get('/pilotos');
export const actualizarPiloto = (id, datos) => api.put(`/pilotos/${id}`, {
  ...datos,
  horasVuelo: Number(datos.horasVuelo) || 0,
  pesoKg: Number(datos.pesoKg)
});
export const listarDisponibilidad = (id) => api.get(`/pilotos/${id}/disponibilidad`);
export const agregarDisponibilidad = (id, fecha, idBloques) => api.post(`/pilotos/${id}/disponibilidad`, { fecha, idBloques });
export const eliminarDisponibilidad = (id, idDisponibilidad) => api.delete(`/pilotos/${id}/disponibilidad/${idDisponibilidad}`);
export const listarBloques = () => api.get('/catalogos/bloques');

// ---- Piloto con sesión: agenda y resultado del vuelo ----
export const obtenerAgenda = () => api.get('/pilotos/agenda');
export const registrarResultado = (idReserva, resultado) => api.post(`/pilotos/agenda/${idReserva}/resultado`, resultado);
