// Validaciones reutilizables del backend. El frontend también valida,
// pero la validación que cuenta es esta: el navegador se puede manipular.
import { solicitudInvalida } from './errores.js';

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'TI', 'PA', 'PPT'];

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Lanza 400 con la lista de campos faltantes. */
export const exigirCampos = (cuerpo, campos) => {
  const faltantes = campos.filter((campo) => {
    const valor = cuerpo?.[campo];
    return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
  });
  if (faltantes.length > 0) {
    throw solicitudInvalida('Faltan campos obligatorios', { faltantes });
  }
};

export const validarCorreo = (correo) => {
  if (!REGEX_CORREO.test(texto(correo))) throw solicitudInvalida('El correo no es válido');
  return texto(correo).toLowerCase();
};

export const validarTipoDocumento = (tipo) => {
  const valor = texto(tipo).toUpperCase();
  if (!TIPOS_DOCUMENTO.includes(valor)) {
    throw solicitudInvalida(`Tipo de documento inválido. Use: ${TIPOS_DOCUMENTO.join(', ')}`);
  }
  return valor;
};

export const validarDocumento = (numero) => {
  const valor = texto(String(numero ?? ''));
  if (!/^[A-Za-z0-9]{4,20}$/.test(valor)) {
    throw solicitudInvalida('El número de documento debe tener entre 4 y 20 letras o números');
  }
  return valor.toUpperCase();
};

export const validarTelefono = (telefono) => {
  const valor = texto(String(telefono ?? '')).replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(valor)) throw solicitudInvalida('El teléfono debe tener entre 7 y 15 dígitos');
  return valor;
};

export const validarNombre = (valor, campo) => {
  const limpio = texto(valor);
  if (limpio.length < 2 || limpio.length > 60) {
    throw solicitudInvalida(`El campo ${campo} debe tener entre 2 y 60 caracteres`);
  }
  return limpio;
};

/** Mínimo 8 caracteres, al menos una letra y un número. */
export const validarContrasena = (contrasena) => {
  const valor = typeof contrasena === 'string' ? contrasena : '';
  if (valor.length < 8 || !/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
    throw solicitudInvalida('La contraseña debe tener mínimo 8 caracteres, con letras y números');
  }
  return valor;
};

export const validarFecha = (fecha, campo = 'fecha') => {
  const valor = texto(fecha);
  if (!REGEX_FECHA.test(valor) || Number.isNaN(new Date(`${valor}T00:00:00`).getTime())) {
    throw solicitudInvalida(`El campo ${campo} debe tener el formato AAAA-MM-DD`);
  }
  return valor;
};

export const validarEntero = (valor, campo, { min = -Infinity, max = Infinity } = {}) => {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw solicitudInvalida(`El campo ${campo} debe ser un número entero entre ${min} y ${max}`);
  }
  return numero;
};

export const validarNumero = (valor, campo, { min = -Infinity, max = Infinity } = {}) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < min || numero > max) {
    throw solicitudInvalida(`El campo ${campo} debe ser un número entre ${min} y ${max}`);
  }
  return numero;
};

/** Fecha de hoy en Colombia, formato AAAA-MM-DD. */
export const hoyEnColombia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
