import { Link, useNavigate } from 'react-router-dom';
import { RUTA_INICIO_POR_ROL } from '../context/authContext';
import { useAuth } from '../context/useAuth';

const ETIQUETA_POR_ROL = {
  Administrador: 'Panel Admin',
  Piloto: 'Mi agenda',
  Cliente: 'Mi cuenta'
};

const Header = () => {
  const { usuario, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    cerrarSesion();
    navigate('/');
  };

  return (
    <header>
      <h1>
        Fly <span>Adventure</span>
      </h1>
      <nav>
        <Link to="/">Inicio</Link>
        <Link to="/vuelos">Vuelos</Link>
        <Link to="/reservar">Reservas</Link>
        <Link to="/nosotros">Nosotros</Link>

        {usuario ? (
          <>
            <Link to={RUTA_INICIO_POR_ROL[rol] || '/'} className="nav-admin-link" data-cy="nav-mi-espacio">
              {ETIQUETA_POR_ROL[rol] || 'Mi espacio'}
            </Link>
            <button onClick={handleLogout} data-cy="btn-cerrar-sesion">Cerrar sesión</button>
          </>
        ) : (
          <>
            <Link to="/login" data-cy="nav-login">Iniciar sesión</Link>
            <Link to="/registro" className="nav-admin-link" data-cy="nav-registro">Registrarse</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
