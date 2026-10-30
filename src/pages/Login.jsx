// Inicio de sesión único para Administrador, Piloto y Cliente.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RUTA_INICIO_POR_ROL } from '../context/authContext';
import { useAuth } from '../context/useAuth';

const Login = () => {
  const { iniciarSesion, estaAutenticado, rol } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const ubicacion = useLocation();

  if (estaAutenticado) return <Navigate to={RUTA_INICIO_POR_ROL[rol] || '/'} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(correo, contrasena);
      const destino = ubicacion.state?.desde || RUTA_INICIO_POR_ROL[usuario.rol] || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">
        <h2>Iniciar <span>sesión</span></h2>
        <p>Clientes, pilotos y administradores de Fly Adventure</p>

        <form onSubmit={handleLogin} data-cy="form-login">
          <div className="input-group">
            <label htmlFor="login-correo">Correo electrónico</label>
            <input
              id="login-correo"
              data-cy="login-correo"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-contrasena">Contraseña</label>
            <input
              id="login-contrasena"
              data-cy="login-contrasena"
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="error-alert" data-cy="login-error" style={{ color: 'red' }}>{error}</p>}

          <button type="submit" className="btn-reserve" data-cy="login-enviar" disabled={enviando} style={{ width: '100%', marginTop: '10px' }}>
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '0.95rem' }}>
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
          <br />
          No necesitas cuenta para <Link to="/reservar">reservar</Link>.
        </p>
        <p style={{ fontSize: '0.85rem', color: '#6b7c93' }}>
          ¿Olvidaste tu contraseña? Escríbenos por WhatsApp y un administrador te ayuda.
        </p>
      </div>
    </main>
  );
};

export default Login;
