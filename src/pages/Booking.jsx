// Formulario de reserva (RF003, RF004 y RF006). No requiere cuenta:
// si el cliente inició sesión, se usan los datos de su cuenta.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { consultarDisponibilidad, crearReserva } from '../services/reservasApi';
import { consultarPronosticoVuelo } from '../services/pronosticoClima';
import { cargarServiciosDisponibles, formatearServicioParaSelect } from '../services/serviciosVuelos';

const TELEFONO_WHATSAPP = '573332642395'; // Número de Fly Adventure

const TIPOS_DOCUMENTO = [
  ['CC', 'Cédula de ciudadanía'],
  ['CE', 'Cédula de extranjería'],
  ['TI', 'Tarjeta de identidad'],
  ['PA', 'Pasaporte'],
  ['PPT', 'Permiso por protección temporal']
];

const formatearHoraPronostico = (horaIso) => horaIso?.split('T')[1] || '';

const formatearDatoClima = (valor, unidad = '') => {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return 'Sin dato';
  return `${Math.round(Number(valor))}${unidad}`;
};

const hoyLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const Booking = () => {
  const location = useLocation();
  const { usuario, rol } = useAuth();
  const esCliente = rol === 'Cliente';

  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [bloques, setBloques] = useState([]);
  const [cargandoBloques, setCargandoBloques] = useState(false);
  const [pronosticoClima, setPronosticoClima] = useState(null);
  const [cargandoClima, setCargandoClima] = useState(false);
  const [errorClima, setErrorClima] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reservaCreada, setReservaCreada] = useState(null);

  const [formData, setFormData] = useState({
    tipoDocumento: usuario?.tipoDocumento || 'CC',
    numeroDocumento: usuario?.numeroDocumento || '',
    nombres: usuario?.nombres || '',
    apellidos: usuario?.apellidos || '',
    correo: usuario?.correo || '',
    telefono: usuario?.telefono || '',
    idServicio: location.state?.idServicio ? String(location.state.idServicio) : '',
    fecha: '',
    idBloque: '',
    peso: '',
    edad: '',
    observaciones: '',
    aceptaTerminos: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
      // Si cambia la fecha, la hora elegida deja de ser válida
      ...(name === 'fecha' ? { idBloque: '' } : {})
    }));
  };

  // Catálogo de servicios
  useEffect(() => {
    let montado = true;
    cargarServiciosDisponibles()
      .then((servicios) => { if (montado) setServiciosDisponibles(servicios); })
      .catch((err) => { if (montado) setError(err.message); })
      .finally(() => { if (montado) setCargandoServicios(false); });
    return () => { montado = false; };
  }, []);

  // Cupos por bloque al cambiar la fecha (RF003)
  useEffect(() => {
    if (!formData.fecha) {
      setBloques([]);
      return undefined;
    }
    const controlador = new AbortController();
    setCargandoBloques(true);
    consultarDisponibilidad(formData.fecha, controlador.signal)
      .then(setBloques)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setCargandoBloques(false));
    return () => controlador.abort();
  }, [formData.fecha]);

  const bloqueSeleccionado = useMemo(
    () => bloques.find((b) => String(b.idBloque) === formData.idBloque) || null,
    [bloques, formData.idBloque]
  );

  // Pronóstico del clima para la fecha y hora elegidas (RF004)
  useEffect(() => {
    let montado = true;
    const controlador = new AbortController();

    if (!formData.fecha || !bloqueSeleccionado) {
      setPronosticoClima(null);
      setErrorClima('');
      setCargandoClima(false);
      return undefined;
    }

    setCargandoClima(true);
    setErrorClima('');
    consultarPronosticoVuelo({ fecha: formData.fecha, hora: bloqueSeleccionado.horaInicio, signal: controlador.signal })
      .then((pronostico) => { if (montado) setPronosticoClima(pronostico); })
      .catch((err) => {
        if (err.name === 'AbortError' || !montado) return;
        setPronosticoClima(null);
        setErrorClima(err.message || 'No se pudo consultar el pronóstico.');
      })
      .finally(() => { if (montado) setCargandoClima(false); });

    return () => {
      montado = false;
      controlador.abort();
    };
  }, [formData.fecha, bloqueSeleccionado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = {
        ...formData,
        idServicio: Number(formData.idServicio),
        idBloque: Number(formData.idBloque),
        peso: Number(formData.peso),
        edad: Number(formData.edad)
      };
      setReservaCreada(await crearReserva(datos));
    } catch (err) {
      setError(err.message);
      // Si el bloque se llenó mientras tanto, refrescamos los cupos
      if (err.estado === 409 && formData.fecha) {
        consultarDisponibilidad(formData.fecha).then(setBloques).catch(() => {});
      }
    } finally {
      setEnviando(false);
    }
  };

  const generarEnlaceWhatsapp = (reserva) => {
    const mensaje = `¡Hola Fly Adventure! 👋 Requiero completar mi reserva:
📌*Código:* ${reserva.codigo}
📌*Nombre:* ${formData.nombres} ${formData.apellidos}
📌*Vuelo:* ${reserva.servicio}
📌*Fecha:* ${reserva.fecha}
📌*Hora:* ${reserva.hora}
📌*Documento:* ${formData.numeroDocumento}

Quedo atento a los métodos de pago para confirmar mi cupo.`;
    return `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  };

  const climaNoApto = pronosticoClima?.recomendacion.nivel === 'malo';

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '40vh' }}>
        <h2>Reserva tu <span>Aventura</span></h2>
        <p>Estás a un paso de tocar el cielo</p>
      </section>

      <section className="section-form">
        <div className="form-container">
          {!reservaCreada && (
            <form onSubmit={handleSubmit} id="form-reserva" data-cy="form-reserva">
              {esCliente ? (
                <p className="aviso-sesion" data-cy="reserva-con-cuenta">
                  Reservando como <strong>{usuario.nombres} {usuario.apellidos}</strong> ({usuario.correo}).
                  Esta reserva quedará en tu historial.
                </p>
              ) : (
                <p className="aviso-sesion">
                  No necesitas cuenta para reservar. Si <Link to="/registro">creas una</Link>, podrás ver tu historial de vuelos.
                </p>
              )}

              <div className="form-grid">
                {!esCliente && (
                  <>
                    <div className="input-group">
                      <label htmlFor="res-tipo">Tipo de documento</label>
                      <select id="res-tipo" name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} data-cy="res-tipo-documento" required>
                        {TIPOS_DOCUMENTO.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label htmlFor="res-documento">Número de documento</label>
                      <input id="res-documento" type="text" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} placeholder="C.C. / Pasaporte" data-cy="res-documento" required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="res-nombres">Nombres</label>
                      <input id="res-nombres" type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Joselin" data-cy="res-nombres" required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="res-apellidos">Apellidos</label>
                      <input id="res-apellidos" type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Lisboa" data-cy="res-apellidos" required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="res-correo">Correo electrónico</label>
                      <input id="res-correo" type="email" name="correo" value={formData.correo} onChange={handleChange} placeholder="correo@ejemplo.com" data-cy="res-correo" required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="res-telefono">Teléfono</label>
                      <input id="res-telefono" type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="WhatsApp" data-cy="res-telefono" required />
                    </div>
                  </>
                )}

                <div className="input-group">
                  <label htmlFor="res-servicio">Tipo de vuelo</label>
                  <select
                    id="res-servicio"
                    name="idServicio"
                    value={formData.idServicio}
                    onChange={handleChange}
                    data-cy="res-servicio"
                    required
                    disabled={cargandoServicios || serviciosDisponibles.length === 0}
                  >
                    <option value="">
                      {cargandoServicios ? 'Cargando planes...' : serviciosDisponibles.length > 0 ? 'Selecciona un plan' : 'No hay planes disponibles'}
                    </option>
                    {serviciosDisponibles.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>{formatearServicioParaSelect(servicio)}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="res-fecha">Fecha del vuelo</label>
                  <input id="res-fecha" type="date" name="fecha" value={formData.fecha} onChange={handleChange} min={hoyLocal()} data-cy="res-fecha" required />
                </div>

                <div className="input-group">
                  <label htmlFor="res-hora">Hora del vuelo</label>
                  <select id="res-hora" name="idBloque" value={formData.idBloque} onChange={handleChange} data-cy="res-hora" required disabled={!formData.fecha || cargandoBloques}>
                    <option value="">
                      {!formData.fecha ? 'Primero elige una fecha' : cargandoBloques ? 'Consultando cupos...' : 'Selecciona una hora'}
                    </option>
                    {bloques.map((bloque) => (
                      <option key={bloque.idBloque} value={bloque.idBloque} disabled={bloque.disponibles === 0}>
                        {bloque.horaInicio} {bloque.disponibles === 0 ? '(Agotado)' : `(${bloque.disponibles} cupos)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="res-peso">Peso (kg)</label>
                  <input id="res-peso" type="number" name="peso" value={formData.peso} onChange={handleChange} placeholder="Máximo 110 kg" min="15" max="150" data-cy="res-peso" required />
                </div>
                <div className="input-group">
                  <label htmlFor="res-edad">Edad</label>
                  <input id="res-edad" type="number" name="edad" value={formData.edad} onChange={handleChange} placeholder="Edad" min="1" max="100" data-cy="res-edad" required />
                </div>
              </div>

              <div className="input-group full-width">
                <label htmlFor="res-observaciones">Condiciones de salud / Observaciones</label>
                <textarea id="res-observaciones" name="observaciones" value={formData.observaciones} onChange={handleChange} placeholder="Cuéntanos si tienes alguna condición médica" maxLength={500} data-cy="res-observaciones"></textarea>
              </div>

              {formData.fecha && bloqueSeleccionado && (
                <div className="weather-widget" data-cy="widget-clima">
                  {cargandoClima && <p className="weather-loading">Consultando pronóstico para tu vuelo...</p>}

                  {!cargandoClima && errorClima && (
                    <div className="weather-error">
                      <h3>Pronóstico no disponible</h3>
                      <p>{errorClima}</p>
                    </div>
                  )}

                  {!cargandoClima && pronosticoClima && (
                    <>
                      <div className="weather-header">
                        <div>
                          <span className="weather-eyebrow">Pronóstico del clima</span>
                          <h3>{pronosticoClima.descripcion}</h3>
                          <p>{formData.fecha} cerca de las {formatearHoraPronostico(pronosticoClima.horaPronostico)}</p>
                        </div>
                        <div className={`weather-badge weather-badge-${pronosticoClima.recomendacion.nivel}`} data-cy="clima-nivel">
                          {pronosticoClima.recomendacion.titulo}
                        </div>
                      </div>

                      <div className="weather-metrics">
                        <div><span>Temperatura</span><strong>{formatearDatoClima(pronosticoClima.temperatura, ' C')}</strong></div>
                        <div><span>Lluvia</span><strong>{formatearDatoClima(pronosticoClima.probabilidadLluvia, '%')}</strong></div>
                        <div><span>Viento</span><strong>{formatearDatoClima(pronosticoClima.velocidadViento, ' km/h')}</strong></div>
                        <div><span>Ráfagas</span><strong>{formatearDatoClima(pronosticoClima.rafagasViento, ' km/h')}</strong></div>
                      </div>

                      <p className="weather-recommendation">{pronosticoClima.recomendacion.texto}</p>
                    </>
                  )}
                </div>
              )}

              <label className="checkbox-line">
                <input type="checkbox" name="aceptaTerminos" checked={formData.aceptaTerminos} onChange={handleChange} data-cy="res-acepta" required />
                Acepto las condiciones del vuelo y autorizo el tratamiento de mis datos personales (Ley 1581 de 2012).
              </label>

              {error && <p className="form-error" data-cy="res-error">{error}</p>}

              <button
                type="submit"
                className="btn-reserve"
                data-cy="res-enviar"
                disabled={climaNoApto || enviando}
                style={climaNoApto ? { backgroundColor: '#ccc', cursor: 'not-allowed', opacity: 0.7 } : {}}
              >
                {climaNoApto ? 'Elige otro horario (Clima no apto)' : enviando ? 'Registrando...' : 'Reservar y pagar por WhatsApp'}
              </button>
            </form>
          )}

          {reservaCreada && (
            <div className="success-message" data-cy="reserva-exitosa" style={{ backgroundColor: '#ffffff', border: '2px solid #FFC300', padding: '30px', color: '#1a4a7c' }}>
              <h3 style={{ color: '#1a4a7c', marginTop: 0 }}>¡Casi listo, {formData.nombres.split(' ')[0]}!</h3>
              <p>Tu código de reserva es</p>
              <p className="codigo-reserva" data-cy="codigo-reserva">{reservaCreada.codigo}</p>
              <p>
                {reservaCreada.servicio} · {reservaCreada.fecha} a las {reservaCreada.hora}.
                Para garantizar tu cupo, realiza el pago por WhatsApp. Guarda el código para{' '}
                <Link to="/mi-reserva">consultar tu reserva</Link>{esCliente ? ' o revisa tu historial en Mi cuenta' : ''}.
              </p>
              <a
                href={generarEnlaceWhatsapp(reservaCreada)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-reserve"
                data-cy="btn-whatsapp"
                style={{ textDecoration: 'none', backgroundColor: '#25D366', color: 'white', display: 'inline-block', marginTop: '15px' }}
              >
                Pagar por WhatsApp 📱
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Booking;
