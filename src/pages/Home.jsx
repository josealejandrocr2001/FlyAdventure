// Página de inicio: propuesta de valor, condiciones de vuelo de hoy, planes y cómo reservar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { consultarPronosticoVuelo } from '../services/pronosticoClima';
import { cargarServiciosDisponibles, formatearPrecio, imagenDelServicio } from '../services/serviciosVuelos';
import '../styles/home.css';

const RAZONES = [
  { icono: 'bi-shield-check', titulo: 'Seguridad primero', texto: 'Pilotos con licencia vigente y equipos revisados antes de cada vuelo.' },
  { icono: 'bi-cloud-sun', titulo: 'Volamos con buen clima', texto: 'Revisamos el pronóstico del viento y la lluvia para cada bloque horario.' },
  { icono: 'bi-camera-video', titulo: 'Recuerdos del vuelo', texto: 'Planes con fotos y video para que compartas la experiencia.' }
];

const PASOS = [
  { titulo: 'Elige tu plan', texto: 'Compara duración y precio de cada vuelo.' },
  { titulo: 'Escoge fecha y hora', texto: 'Verás los cupos disponibles y el pronóstico del clima.' },
  { titulo: 'Paga por WhatsApp', texto: 'Recibes un código de reserva y coordinas el pago con nosotros.' },
  { titulo: 'Vuela', texto: 'Llega a San Félix 20 minutos antes de tu hora.' }
];

// Próximo horario de vuelo para mostrar las condiciones (los vuelos van de 9:00 a 16:30)
const proximoHorario = () => {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const hora = ahora.getHours();
  const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (hora < 9) return { fecha: fecha(ahora), hora: '10:00', etiqueta: 'Hoy a las 10:00 a. m.' };
  if (hora < 16) {
    const siguiente = `${String(hora + 1).padStart(2, '0')}:00`;
    return { fecha: fecha(ahora), hora: siguiente, etiqueta: `Hoy a las ${siguiente}` };
  }
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  return { fecha: fecha(manana), hora: '10:00', etiqueta: 'Mañana a las 10:00 a. m.' };
};

const CondicionesDeVuelo = () => {
  const [pronostico, setPronostico] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [horario] = useState(proximoHorario);

  useEffect(() => {
    const controlador = new AbortController();
    consultarPronosticoVuelo({ fecha: horario.fecha, hora: horario.hora, signal: controlador.signal })
      .then((datos) => { setPronostico(datos); setEstado('listo'); })
      .catch((error) => { if (error.name !== 'AbortError') setEstado('error'); });
    return () => controlador.abort();
  }, [horario]);

  if (estado === 'error') return null; // sin pronóstico, la página sigue igual

  return (
    <aside className="condiciones" aria-live="polite" data-cy="condiciones-hoy">
      <div className="condiciones-lugar">
        <i className="bi bi-wind" aria-hidden="true"></i>
        <div>
          <strong>Condiciones en San Félix</strong>
          <span>{horario.etiqueta}</span>
        </div>
      </div>

      {estado === 'cargando' ? (
        <p className="condiciones-cargando">Consultando el pronóstico…</p>
      ) : (
        <>
          <dl className="condiciones-datos">
            <div><dt>Viento</dt><dd>{Math.round(pronostico.velocidadViento)} km/h</dd></div>
            <div><dt>Ráfagas</dt><dd>{Math.round(pronostico.rafagasViento)} km/h</dd></div>
            <div><dt>Lluvia</dt><dd>{Math.round(pronostico.probabilidadLluvia)} %</dd></div>
            <div><dt>Cielo</dt><dd>{pronostico.descripcion}</dd></div>
          </dl>
          <span className={`condiciones-nivel nivel-${pronostico.recomendacion.nivel}`}>
            {pronostico.recomendacion.titulo}
          </span>
        </>
      )}
    </aside>
  );
};

const Home = () => {
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    cargarServiciosDisponibles()
      .then((servicios) => setPlanes(servicios.slice(0, 3)))
      .catch(() => setPlanes([]));
  }, []);

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-contenido">
          <h1>Vive la libertad de volar</h1>
          <p>
            Vuelos biplaza en parapente sobre el valle de Aburrá, desde San Félix,
            con pilotos certificados.
          </p>
          <div className="home-hero-acciones">
            <Link to="/reservar" className="btn-vela btn-grande">Reservar mi vuelo</Link>
            <Link to="/vuelos" className="btn-contorno">Ver planes</Link>
          </div>
        </div>
        <CondicionesDeVuelo />
      </section>

      <section className="home-seccion home-razones">
        <h2>¿Por qué volar con nosotros?</h2>
        <div className="razones">
          {RAZONES.map((razon) => (
            <article key={razon.titulo} className="razon">
              <i className={`bi ${razon.icono}`} aria-hidden="true"></i>
              <h3>{razon.titulo}</h3>
              <p>{razon.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {planes.length > 0 && (
        <section className="home-seccion home-planes">
          <div className="seccion-encabezado">
            <h2>Planes de vuelo</h2>
            <Link to="/vuelos" className="enlace-flecha">Ver todos los planes</Link>
          </div>
          <div className="planes">
            {planes.map((plan, indice) => (
              <article key={plan.id} className="plan">
                <img src={imagenDelServicio(plan, indice)} alt={`Pasajero en un ${plan.titulo.toLowerCase()}`} loading="lazy" />
                <div className="plan-cuerpo">
                  <h3>{plan.titulo}</h3>
                  <p>{plan.descripcion}</p>
                  <div className="plan-pie">
                    <span className="plan-precio">{formatearPrecio(plan.precio)}</span>
                    <span className="plan-duracion"><i className="bi bi-stopwatch" aria-hidden="true"></i> {plan.duracionMinutos} min</span>
                  </div>
                  <Link to="/reservar" state={{ idServicio: plan.id }} className="btn-vela">Reservar este plan</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="home-seccion">
        <h2>Así de fácil es reservar</h2>
        <ol className="pasos">
          {PASOS.map((paso) => (
            <li key={paso.titulo}>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-cierre">
        <div>
          <h2>¿Ya reservaste?</h2>
          <p>Consulta el estado de tu vuelo con el código que recibiste, o crea una cuenta para ver tu historial.</p>
        </div>
        <div className="home-cierre-acciones">
          <Link to="/mi-reserva" className="btn-vela">Consultar mi reserva</Link>
          <Link to="/registro" className="btn-contorno btn-contorno-claro">Crear cuenta</Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
