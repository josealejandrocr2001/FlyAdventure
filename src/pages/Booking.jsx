import React, { useState, useEffect } from 'react'; // IMPORTANTE: Agregamos useEffect
import { useLocation } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"; // Importamos las herramientas de consulta
import { cargarServiciosDisponibles, formatearServicioParaSelect, obtenerTituloServicio } from "../services/serviciosVuelos";
import { consultarPronosticoVuelo } from "../services/pronosticoClima";

// 1. FUNCIÓN PARA GENERAR LOS BLOQUES DE HORARIOS (9am a 4pm)
const generarHorarios = () => {
  const horarios = [];
  for (let h = 9; h <= 16; h++) {
    const horaStr = h < 10 ? `0${h}` : h;
    horarios.push(`${horaStr}:00`);
    if (h !== 16) horarios.push(`${horaStr}:30`); // Para que termine a las 16:00 en punto
  }
  return horarios;
};
const bloquesDisponibles = generarHorarios();

const formatearHoraPronostico = (horaIso) => horaIso?.split('T')[1] || '';

const formatearDatoClima = (valor, unidad = '') => {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return 'Sin dato';
  }

  return `${Math.round(Number(valor))}${unidad}`;
};

const Booking = () => {
  const location = useLocation();
  const tipoVueloInicial = typeof location.state?.tipoVuelo === 'string' ? location.state.tipoVuelo : '';
  const [cuposOcupados, setCuposOcupados] = useState({}); // Estado para llevar la cuenta de los cupos
  const [mostrarPago, setMostrarPago] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [pronosticoClima, setPronosticoClima] = useState(null);
  const [cargandoClima, setCargandoClima] = useState(false);
  const [errorClima, setErrorClima] = useState('');

  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "servicios"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filtramos para que solo salgan los que están habilitados (visibles)
        setServicios(data.filter(s => s.activo !== false));
      } catch (error) {
        console.error("Error al cargar los servicios:", error);
      }
    };
    cargarServicios();
  }, []);

  // 2. ESTADO PARA RECOGER LOS DATOS DEL FORMULARIO (Agregamos 'hora')
  const [formData, setFormData] = useState({
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    tipoVuelo: tipoVueloInicial,
    fecha: '',
    hora: '', // Nuevo campo
    peso: '',
    edad: '',
    observaciones: ''
  });

  // Función para actualizar el estado conforme el usuario escribe
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    let montado = true;

    const cargarServicios = async () => {
      try {
        const servicios = await cargarServiciosDisponibles();
        if (montado) {
          setServiciosDisponibles(servicios);
        }
      } catch (error) {
        console.error("Error al cargar servicios disponibles:", error);
        if (montado) {
          setServiciosDisponibles([]);
        }
      } finally {
        if (montado) {
          setCargandoServicios(false);
        }
      }
    };

    cargarServicios();

    return () => {
      montado = false;
    };
  }, []);

  // 3. CONSULTAR DISPONIBILIDAD AL CAMBIAR LA FECHA
  useEffect(() => {
    const verificarDisponibilidad = async () => {
      // Si no hay fecha seleccionada, no hacemos la consulta
      if (!formData.fecha) {
        setCuposOcupados({});
        return;
      }

      try {
        // Buscamos las reservas para la fecha elegida que no estén eliminadas
        const q = query(
          collection(db, "reservas"),
          where("fecha", "==", formData.fecha),
          where("estado", "!=", "eliminada")
        );

        const querySnapshot = await getDocs(q);
        const conteo = {};

        // Contamos cuántas reservas hay por cada hora
        querySnapshot.forEach((doc) => {
          const horaGuardada = doc.data().hora;
          if (horaGuardada) {
            conteo[horaGuardada] = (conteo[horaGuardada] || 0) + 1;
          }
        });

        setCuposOcupados(conteo);
      } catch (error) {
        console.error("Error al consultar disponibilidad:", error);
      }
    };

    verificarDisponibilidad();
  }, [formData.fecha]); // Este useEffect se dispara cada vez que cambia formData.fecha

  // Función para enviar a la base de datos
  useEffect(() => {
    let montado = true;
    const controlador = new AbortController();

    const cargarPronostico = async () => {
      if (!formData.fecha || !formData.hora) {
        setPronosticoClima(null);
        setErrorClima('');
        setCargandoClima(false);
        return;
      }

      setCargandoClima(true);
      setErrorClima('');

      try {
        const pronostico = await consultarPronosticoVuelo({
          fecha: formData.fecha,
          hora: formData.hora,
          signal: controlador.signal
        });

        if (montado) {
          setPronosticoClima(pronostico);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;

        console.error("Error al consultar clima:", error);
        if (montado) {
          setPronosticoClima(null);
          setErrorClima(error.message || 'No se pudo consultar el pronostico.');
        }
      } finally {
        if (montado) {
          setCargandoClima(false);
        }
      }
    };

    cargarPronostico();

    return () => {
      montado = false;
      controlador.abort();
    };
  }, [formData.fecha, formData.hora]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const reservaData = {
        ...formData,
        estado: "pendiente",
        fechaCreacion: serverTimestamp()
      };

      await addDoc(collection(db, "reservas"), reservaData);

      // En lugar de solo mensaje de éxito, activamos la vista de pago
      setMostrarPago(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const generarEnlaceWhatsapp = () => {
    const telefono = "573332642395"; // Tu número de FlyAdventure
    const mensaje = `¡Hola Fly Adventure! 👋 Requiero completar mi reserva:
📌*Nombre:* ${formData.nombre}
📌*Vuelo:* ${formData.tipoVuelo}
📌*Fecha:* ${formData.fecha}
📌*Hora:* ${formData.hora}
📌*Documento:* ${formData.documento}

Quedo atento a los métodos de pago para confirmar mi cupo.`;

    return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  };

  const hoy = new Date().toISOString().split('T')[0];

  const climaNoApto = pronosticoClima && pronosticoClima.recomendacion.nivel === 'malo';

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '40vh' }}>
        <h2>Reserva tu <span>Aventura</span></h2>
        <p>Estás a un paso de tocar el cielo</p>
      </section>

      <section className="section-form">
        <div className="form-container">
          <form onSubmit={handleSubmit} id="form-reserva">
            <div className="form-grid">

              <div className="input-group">
                <label>Documento de Identidad</label>
                <input type="text" name="documento" value={formData.documento} onChange={handleChange} placeholder="C.C. / Pasaporte" required />
              </div>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Joselin Lisboa" required />
              </div>
              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" required />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="WhatsApp" required />
              </div>

              <div className="input-group">
                <label>Tipo de Vuelo</label>
                <select
                  name="tipoVuelo"
                  value={formData.tipoVuelo}
                  onChange={handleChange}
                  required
                  disabled={cargandoServicios || serviciosDisponibles.length === 0}
                >
                  <option value="">
                    {cargandoServicios
                      ? "Cargando planes..."
                      : serviciosDisponibles.length > 0
                        ? "Selecciona un plan"
                        : "No hay planes disponibles"}
                  </option>
                  {serviciosDisponibles.map((servicio) => (
                    <option key={servicio.id} value={obtenerTituloServicio(servicio)}>
                      {formatearServicioParaSelect(servicio)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Fecha del Vuelo</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} min={hoy} required />
              </div>

              {/* 4. NUEVO CAMPO: HORA DEL VUELO */}
              <div className="input-group">
                <label>Hora del Vuelo</label>
                <select
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                  required
                  disabled={!formData.fecha} // Bloqueado si no hay fecha
                >
                  <option value="">{formData.fecha ? "Selecciona una hora" : "Primero elige una fecha"}</option>
                  {bloquesDisponibles.map(horario => {
                    const ocupados = cuposOcupados[horario] || 0;
                    const estaLleno = ocupados >= 5; // Límite de 5 cupos por bloque

                    return (
                      <option key={horario} value={horario} disabled={estaLleno}>
                        {horario} {estaLleno ? "(Agotado)" : `(${5 - ocupados} cupos)`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="input-group">
                <label>Peso (kg)</label>
                <input type="number" name="peso" value={formData.peso} onChange={handleChange} placeholder="Máximo 150kg" max="150" required />
              </div>
              <div className="input-group">
                <label>Edad</label>
                <input type="number" name="edad" value={formData.edad} onChange={handleChange} placeholder="Edad" max="100" required />
              </div>
            </div>

            <div className="input-group full-width">
              <label>Condiciones de Salud / Observaciones</label>
              <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} placeholder="Cuéntanos si tienes alguna condición médica"></textarea>
            </div>

            {/* 1. ESTE ES EL NUEVO BOTÓN (Reemplaza al anterior) */}
            {formData.fecha && formData.hora && (
              <div className="weather-widget">
                {cargandoClima && (
                  <p className="weather-loading">Consultando pronostico para tu vuelo...</p>
                )}

                {!cargandoClima && errorClima && (
                  <div className="weather-error">
                    <h3>Pronostico no disponible</h3>
                    <p>{errorClima}</p>
                  </div>
                )}

                {!cargandoClima && pronosticoClima && (
                  <>
                    <div className="weather-header">
                      <div>
                        <span className="weather-eyebrow">Pronostico del clima</span>
                        <h3>{pronosticoClima.descripcion}</h3>
                        <p>
                          {formData.fecha} cerca de las {formatearHoraPronostico(pronosticoClima.horaPronostico)}
                        </p>
                      </div>
                      <div className={`weather-badge weather-badge-${pronosticoClima.recomendacion.nivel}`}>
                        {pronosticoClima.recomendacion.titulo}
                      </div>
                    </div>

                    <div className="weather-metrics">
                      <div>
                        <span>Temperatura</span>
                        <strong>{formatearDatoClima(pronosticoClima.temperatura, ' C')}</strong>
                      </div>
                      <div>
                        <span>Lluvia</span>
                        <strong>{formatearDatoClima(pronosticoClima.probabilidadLluvia, '%')}</strong>
                      </div>
                      <div>
                        <span>Viento</span>
                        <strong>{formatearDatoClima(pronosticoClima.velocidadViento, ' km/h')}</strong>
                      </div>
                      <div>
                        <span>Rafagas</span>
                        <strong>{formatearDatoClima(pronosticoClima.rafagasViento, ' km/h')}</strong>
                      </div>
                    </div>

                    <p className="weather-recommendation">
                      {pronosticoClima.recomendacion.texto}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 1. BOTÓN DE PAGO DINÁMICO */}
            {!mostrarPago && (
              <button 
                type="submit" 
                className="btn-reserve"
                disabled={climaNoApto}
                style={climaNoApto ? { backgroundColor: '#ccc', cursor: 'not-allowed', opacity: 0.7 } : {}}
              >
                {climaNoApto ? "Elige otro horario (Clima no apto)" : "Proceder al Pago"}
              </button>
            )}
          </form>

          {/* 2. ESTE ES EL NUEVO MENSAJE Y BOTÓN DE WHATSAPP (Reemplaza al {enviado && ...}) */}
          {mostrarPago && (
            <div className="success-message" style={{ backgroundColor: '#ffffff', border: '2px solid #FFC300', padding: '30px' }}>
              {/* Nota: Quité el símbolo $ antes de las llaves para que React lo lea bien */}
              <h3 style={{ color: '#1a4a7c', marginTop: 0 }}>¡Casi listo, {formData.nombre.split(' ')[0]}!</h3>
              <p>Para garantizar tu cupo en la fecha y hora seleccionada, debes realizar el pago.</p>
              <a
                href={generarEnlaceWhatsapp()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-reserve"
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
