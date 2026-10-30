import { api } from './api';

export const listarUsuarios = (rol) => api.get(rol ? `/usuarios?rol=${encodeURIComponent(rol)}` : '/usuarios');
export const crearUsuario = (datos) => api.post('/usuarios', datos);
export const cambiarEstadoUsuario = (id, activo) => api.patch(`/usuarios/${id}/activo`, { activo });
