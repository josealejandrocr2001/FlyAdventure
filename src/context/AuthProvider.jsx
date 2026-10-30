// Estado global de la sesión: quién está conectado y con qué rol.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, guardarSesion, leerSesion, registrarAlExpirarSesion } from '../services/api';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [sesion, setSesion] = useState(() => leerSesion());

  const actualizarSesion = useCallback((nueva) => {
    guardarSesion(nueva);
    setSesion(nueva);
  }, []);

  const cerrarSesion = useCallback(() => actualizarSesion(null), [actualizarSesion]);

  useEffect(() => {
    registrarAlExpirarSesion(cerrarSesion);
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (correo, contrasena) => {
    const datos = await api.post('/auth/login', { correo, contrasena });
    actualizarSesion(datos);
    return datos.usuario;
  }, [actualizarSesion]);

  const registrarse = useCallback(async (datosRegistro) => {
    const datos = await api.post('/auth/registro', datosRegistro);
    actualizarSesion(datos);
    return datos.usuario;
  }, [actualizarSesion]);

  const valor = useMemo(() => ({
    usuario: sesion?.usuario ?? null,
    rol: sesion?.usuario?.rol ?? null,
    estaAutenticado: Boolean(sesion?.token),
    iniciarSesion,
    registrarse,
    cerrarSesion
  }), [sesion, iniciarSesion, registrarse, cerrarSesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
