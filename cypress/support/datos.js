// Datos compartidos por las pruebas. Los usuarios de prueba vienen de
// database/FlyAdventure_MySQL_v2.sql (ver README): solo existen en el ambiente local.

export const API = 'http://localhost:4000/api';

export const CLAVE_USUARIOS_PRUEBA = 'FlyAdventure2026*';

// Cliente con cuenta del script (Ana Gómez)
export const CLIENTE_SCRIPT = { correo: 'ana@correo.com', documento: '1036111222' };

/** Marca de tiempo para que cada corrida use datos que no existan en la base. */
export const marca = () => Date.now();

/** Fecha AAAA-MM-DD dentro de `dias` días. */
export const fechaEnDias = (dias) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);

/** Datos personales de un invitado (reserva sin cuenta). */
export const invitado = (id) => ({
  tipoDocumento: 'CC',
  numeroDocumento: String(id).slice(-10),
  nombres: 'Invitado',
  apellidos: 'Cypress',
  correo: `invitado${id}@correo.com`,
  telefono: '3001234567'
});
