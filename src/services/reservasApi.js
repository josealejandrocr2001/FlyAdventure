import { api } from './api';

export const ESTADOS_RESERVA = ['Pendiente', 'Confirmada', 'Asignada', 'Ejecutada', 'Cancelada', 'Expirada'];
export const MEDIOS_PAGO = ['Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Tarjeta'];

// ---- Público ----
export const consultarDisponibilidad = (fecha, signal) =>
  api.get(`/reservas/disponibilidad?fecha=${encodeURIComponent(fecha)}`, { signal });

export const crearReserva = (datos) => api.post('/reservas', datos);

export const consultarReservaPorCodigo = (codigo, documento) =>
  api.get(`/reservas/consulta?codigo=${encodeURIComponent(codigo)}&documento=${encodeURIComponent(documento)}`);

// ---- Cliente con cuenta ----
export const obtenerMisReservas = () => api.get('/reservas/mias');

// ---- Administrador ----
export const listarReservas = () => api.get('/reservas');
export const actualizarReserva = (id, cambios) => api.put(`/reservas/${id}`, cambios);
export const cambiarEstadoReserva = (id, estado, extra = {}) =>
  api.patch(`/reservas/${id}/estado`, { estado, ...extra });
export const obtenerHistorialReserva = (id) => api.get(`/reservas/${id}/historial`);
