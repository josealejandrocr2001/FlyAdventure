// Correos al cliente con EmailJS (RF019). Los identificadores van en .env.local.
import emailjs from '@emailjs/browser';

const CONFIG = {
  servicio: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  llavePublica: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  plantillaConfirmacion: import.meta.env.VITE_EMAILJS_TEMPLATE_CONFIRMACION,
  plantillaEncuesta: import.meta.env.VITE_EMAILJS_TEMPLATE_ENCUESTA
};

const URL_SITIO = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

const enviar = async (plantilla, parametros) => {
  if (!CONFIG.servicio || !CONFIG.llavePublica || !plantilla) {
    console.warn('[EmailJS] Falta configuración en .env.local; no se envió el correo.', parametros);
    return { enviado: false };
  }
  await emailjs.send(CONFIG.servicio, plantilla, parametros, CONFIG.llavePublica);
  return { enviado: true };
};

export const enviarConfirmacionPago = (reserva) => enviar(CONFIG.plantillaConfirmacion, {
  to_name: reserva.cliente.nombres,
  to_email: reserva.cliente.correo,
  fecha_vuelo: reserva.fecha,
  hora_vuelo: reserva.hora,
  tipo_vuelo: reserva.servicio,
  codigo_reserva: reserva.codigo
});

export const enviarEncuesta = (reserva, tokenEncuesta) => enviar(CONFIG.plantillaEncuesta, {
  to_name: reserva.cliente.nombres,
  to_email: reserva.cliente.correo,
  link_encuesta: `${URL_SITIO}/encuesta/${tokenEncuesta}`
});
