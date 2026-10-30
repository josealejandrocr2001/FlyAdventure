// Cliente HTTP único para hablar con la API de FlyAdventure.
// Todas las páginas usan estas funciones; nadie llama fetch() directo a la API.

const URL_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const CLAVE_SESION = 'flyadventure.sesion';

export const leerSesion = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null;
  } catch {
    return null;
  }
};

export const guardarSesion = (sesion) => {
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    // El navegador puede bloquear localStorage (modo privado); la sesión vive solo en memoria
  }
};

export class ApiError extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

// Se ejecuta cuando la API responde 401 (token vencido). Lo registra AuthContext.
let alExpirarSesion = () => {};
export const registrarAlExpirarSesion = (funcion) => { alExpirarSesion = funcion; };

/**
 * Hace la petición, agrega el token si hay sesión y convierte los errores
 * de la API ({ error: '...' }) en ApiError con un mensaje listo para mostrar.
 */
export const pedir = async (ruta, { metodo = 'GET', cuerpo, signal } = {}) => {
  const sesion = leerSesion();
  const encabezados = { Accept: 'application/json' };
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
  if (sesion?.token) encabezados.Authorization = `Bearer ${sesion.token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'No hay conexión con el servidor. ¿Está corriendo la API (npm run dev en /server)?');
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && sesion?.token) alExpirarSesion();
    throw new ApiError(respuesta.status, datos?.error || 'Ocurrió un error inesperado', datos?.detalles);
  }
  return datos;
};

export const api = {
  get: (ruta, opciones) => pedir(ruta, opciones),
  post: (ruta, cuerpo) => pedir(ruta, { metodo: 'POST', cuerpo }),
  put: (ruta, cuerpo) => pedir(ruta, { metodo: 'PUT', cuerpo }),
  patch: (ruta, cuerpo) => pedir(ruta, { metodo: 'PATCH', cuerpo }),
  delete: (ruta) => pedir(ruta, { metodo: 'DELETE' })
};
