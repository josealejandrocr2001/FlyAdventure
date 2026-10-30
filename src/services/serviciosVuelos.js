import { api } from './api';

export const obtenerTituloServicio = (servicio) => servicio.titulo?.trim() || '';

export const servicioEstaDisponible = (servicio) => (
  servicio.activo !== false && Boolean(obtenerTituloServicio(servicio))
);

export const formatearPrecio = (valor) => `$${Number(valor || 0).toLocaleString('es-CO')}`;

export const formatearServicioParaSelect = (servicio) => {
  const titulo = obtenerTituloServicio(servicio);
  const precio = Number(servicio.precio);
  if (!Number.isFinite(precio) || precio <= 0) return titulo;
  return `${titulo} - ${formatearPrecio(precio)}`;
};

/** Catálogo público: solo servicios visibles. */
export const cargarServiciosDisponibles = () => api.get('/servicios');

/** Panel: incluye los ocultos. Requiere sesión de Administrador. */
export const cargarServiciosDeVuelo = () => api.get('/servicios/todos');

export const guardarServicio = (servicio) => {
  const cuerpo = {
    titulo: servicio.titulo,
    descripcion: servicio.descripcion,
    precio: Number(servicio.precio),
    duracionMinutos: Number(servicio.duracionMinutos) || 15,
    imagen: servicio.imagen,
    activo: servicio.activo !== false
  };
  return servicio.id ? api.put(`/servicios/${servicio.id}`, cuerpo) : api.post('/servicios', cuerpo);
};

export const cambiarVisibilidadServicio = (id, activo) => api.patch(`/servicios/${id}/activo`, { activo });

export const eliminarServicio = (id) => api.delete(`/servicios/${id}`);
