// Registro de clientes (RF016). Registrarse es opcional: se puede reservar sin cuenta.
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RUTA_INICIO_POR_ROL } from '../context/authContext';
import { useAuth } from '../context/useAuth';

const TIPOS_DOCUMENTO = [
  ['CC', 'Cédula de ciudadanía'],
  ['CE', 'Cédula de extranjería'],
  ['TI', 'Tarjeta de identidad'],
  ['PA', 'Pasaporte'],
  ['PPT', 'Permiso por protección temporal']
];

const FORMULARIO_INICIAL = {
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
  autorizaDatos: false
};

const Registro = () => {
  const { registrarse, estaAutenticado, rol } = useAuth();
  const [form, setForm] = useState(FORMULARIO_INICIAL);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  if (estaAutenticado) return <Navigate to={RUTA_INICIO_POR_ROL[rol] || '/'} replace />;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.contrasena !== form.confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmarContrasena, ...datos } = form;
      await registrarse(datos);
      navigate('/mi-cuenta', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '35vh' }}>
        <h2>Crea tu <span>cuenta</span></h2>
        <p>Consulta tu historial de vuelos y tus reservas en un solo lugar</p>
      </section>

      <section className="section-form">
        <div className="form-container">
          <form onSubmit={handleSubmit} data-cy="form-registro">
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="reg-tipo">Tipo de documento</label>
                <select id="reg-tipo" name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange} data-cy="reg-tipo-documento" required>
                  {TIPOS_DOCUMENTO.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="reg-documento">Número de documento</label>
                <input id="reg-documento" name="numeroDocumento" value={form.numeroDocumento} onChange={handleChange} data-cy="reg-documento" required />
              </div>
              <div className="input-group">
                <label htmlFor="reg-nombres">Nombres</label>
                <input id="reg-nombres" name="nombres" value={form.nombres} onChange={handleChange} data-cy="reg-nombres" required />
              </div>
              <div className="input-group">
                <label htmlFor="reg-apellidos">Apellidos</label>
                <input id="reg-apellidos" name="apellidos" value={form.apellidos} onChange={handleChange} data-cy="reg-apellidos" required />
              </div>
              <div className="input-group">
                <label htmlFor="reg-correo">Correo electrónico</label>
                <input id="reg-correo" type="email" name="correo" value={form.correo} onChange={handleChange} data-cy="reg-correo" autoComplete="email" required />
              </div>
              <div className="input-group">
                <label htmlFor="reg-telefono">Teléfono (WhatsApp)</label>
                <input id="reg-telefono" type="tel" name="telefono" value={form.telefono} onChange={handleChange} data-cy="reg-telefono" required />
              </div>
              <div className="input-group">
                <label htmlFor="reg-contrasena">Contraseña</label>
                <input id="reg-contrasena" type="password" name="contrasena" value={form.contrasena} onChange={handleChange} data-cy="reg-contrasena" autoComplete="new-password" minLength={8} required />
                <small style={{ color: '#6b7c93', marginTop: '6px' }}>Mínimo 8 caracteres, con letras y números.</small>
              </div>
              <div className="input-group">
                <label htmlFor="reg-confirmar">Confirmar contraseña</label>
                <input id="reg-confirmar" type="password" name="confirmarContrasena" value={form.confirmarContrasena} onChange={handleChange} data-cy="reg-confirmar" autoComplete="new-password" required />
              </div>
            </div>

            <label className="checkbox-line">
              <input type="checkbox" name="autorizaDatos" checked={form.autorizaDatos} onChange={handleChange} data-cy="reg-autoriza" required />
              Autorizo a Fly Adventure el tratamiento de mis datos personales para gestionar mis reservas (Ley 1581 de 2012).
            </label>

            {error && <p className="form-error" data-cy="reg-error">{error}</p>}

            <button type="submit" className="btn-reserve" data-cy="reg-enviar" disabled={enviando}>
              {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '25px' }}>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>.
            Si ya reservaste antes, regístrate con el mismo documento y correo para ver esos vuelos en tu historial.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Registro;
