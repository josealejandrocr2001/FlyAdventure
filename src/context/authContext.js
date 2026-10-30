import { createContext } from 'react';

export const AuthContext = createContext(null);

// Rol → página de inicio después de iniciar sesión
export const RUTA_INICIO_POR_ROL = {
  Administrador: '/admin-panel',
  Piloto: '/piloto',
  Cliente: '/mi-cuenta'
};
