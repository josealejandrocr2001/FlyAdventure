// Muestra la página solo si hay sesión y el rol está permitido.
// <RutaProtegida roles={['Administrador']}><AdminPanel /></RutaProtegida>
// Ojo: esto solo oculta pantallas. La seguridad real la aplica la API (autorizar()).
import { Navigate, useLocation } from 'react-router-dom';
import { RUTA_INICIO_POR_ROL } from '../context/authContext';
import { useAuth } from '../context/useAuth';

const RutaProtegida = ({ roles, children }) => {
  const { estaAutenticado, rol } = useAuth();
  const ubicacion = useLocation();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (roles && !roles.includes(rol)) {
    return <Navigate to={RUTA_INICIO_POR_ROL[rol] || '/'} replace />;
  }
  return children;
};

export default RutaProtegida;
