// Error con código HTTP. Lánzelo desde servicios o rutas:
//   throw new HttpError(404, 'La reserva no existe');
export class HttpError extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

export const noEncontrado = (mensaje = 'Recurso no encontrado') => new HttpError(404, mensaje);
export const solicitudInvalida = (mensaje, detalles) => new HttpError(400, mensaje, detalles);
export const conflicto = (mensaje) => new HttpError(409, mensaje);
