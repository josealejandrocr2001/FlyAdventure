// Encabezado: navegación principal, accesos de cuenta con iconos y menú móvil.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { RUTA_INICIO_POR_ROL } from '../context/authContext';
import { useAuth } from '../context/useAuth';

const ESPACIO_POR_ROL = {
  Administrador: { texto: 'Panel de administración', icono: 'bi-speedometer2' },
  Piloto: { texto: 'Mi agenda de vuelos', icono: 'bi-calendar2-week' },
  Cliente: { texto: 'Mi cuenta', icono: 'bi-person-circle' }
};

const Header = () => {
  const { usuario, rol, cerrarSesion } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();

  const cerrarMenu = () => setMenuAbierto(false);

  const handleLogout = () => {
    cerrarMenu();
    cerrarSesion();
    navigate('/');
  };

  const espacio = ESPACIO_POR_ROL[rol];

  return (
    <header className="site-header">
      <Link to="/" className="site-logo" onClick={cerrarMenu} aria-label="Fly Adventure, ir al inicio">
        Fly <span>Adventure</span>
      </Link>

      <nav id="menu-principal" className={`site-nav ${menuAbierto ? 'abierto' : ''}`} aria-label="Principal">
        <NavLink to="/" end onClick={cerrarMenu}>Inicio</NavLink>
        <NavLink to="/vuelos" onClick={cerrarMenu}>Vuelos</NavLink>
        <NavLink to="/nosotros" onClick={cerrarMenu}>Nosotros</NavLink>
        <NavLink to="/mi-reserva" onClick={cerrarMenu}>Consultar reserva</NavLink>

        {/* En el celular las acciones de cuenta se muestran con texto dentro del menú */}
        {usuario ? (
          <>
            <NavLink to={RUTA_INICIO_POR_ROL[rol] || '/'} className="solo-movil" onClick={cerrarMenu}>
              <i className={`bi ${espacio?.icono}`} aria-hidden="true"></i> {espacio?.texto}
            </NavLink>
            <a href="/" className="solo-movil" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <i className="bi bi-box-arrow-right" aria-hidden="true"></i> Cerrar sesión
            </a>
          </>
        ) : (
          <>
            <NavLink to="/login" className="solo-movil" onClick={cerrarMenu}>
              <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i> Iniciar sesión
            </NavLink>
            <NavLink to="/registro" className="solo-movil" onClick={cerrarMenu}>
              <i className="bi bi-person-plus" aria-hidden="true"></i> Crear cuenta
            </NavLink>
          </>
        )}
      </nav>

      <div className="site-actions">
        {usuario ? (
          <>
            <span className="saludo-usuario">Hola, {usuario.nombres.split(' ')[0]}</span>
            <Link
              to={RUTA_INICIO_POR_ROL[rol] || '/'}
              className="icon-btn accion-escritorio"
              data-tip={espacio?.texto}
              aria-label={espacio?.texto}
              data-cy="nav-mi-espacio"
            >
              <i className={`bi ${espacio?.icono}`} aria-hidden="true"></i>
            </Link>
            <button
              type="button"
              className="icon-btn peligro accion-escritorio"
              onClick={handleLogout}
              data-tip="Cerrar sesión"
              aria-label="Cerrar sesión"
              data-cy="btn-cerrar-sesion"
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="icon-btn accion-escritorio" data-tip="Iniciar sesión" aria-label="Iniciar sesión" data-cy="nav-login">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
            </Link>
            <Link to="/registro" className="icon-btn accion-escritorio" data-tip="Crear cuenta" aria-label="Crear cuenta" data-cy="nav-registro">
              <i className="bi bi-person-plus" aria-hidden="true"></i>
            </Link>
          </>
        )}
        {rol !== 'Administrador' && rol !== 'Piloto' && (
          <Link to="/reservar" className="btn-vela" onClick={cerrarMenu}>Reservar</Link>
        )}
      </div>

      <button
        type="button"
        className="icon-btn menu-toggle"
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        aria-expanded={menuAbierto}
        aria-controls="menu-principal"
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        <i className={`bi ${menuAbierto ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true"></i>
      </button>
    </header>
  );
};

export default Header;
