import { api } from './api';

export const obtenerEncuesta = (token) => api.get(`/encuestas/${encodeURIComponent(token)}`);
export const responderEncuesta = (token, satisfaccion, comentario) =>
  api.post(`/encuestas/${encodeURIComponent(token)}`, { satisfaccion, comentario });
