// Panel del Administrador: indicadores, reservas (con asignación piloto + equipo), servicios, equipos, pilotos y usuarios.
// Todos los datos vienen de la API (MySQL); nada se escribe directo a la base de datos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css';
import { useAuth } from '../context/useAuth';
import { crearAsignacion, obtenerRecomendacion } from '../services/asignacionesApi';
import { ESTADOS_EQUIPO, TIPOS_EQUIPO, cambiarEstadoEquipo, guardarEquipo as guardarEquipoApi, listarEquipos } from '../services/equiposApi';
import { enviarConfirmacionPago, enviarEncuesta } from '../services/notificaciones';
import {
  MEDIOS_PAGO, actualizarReserva, cambiarEstadoReserva, consultarDisponibilidad, listarReservas
} from '../services/reservasApi';
import {
  cambiarVisibilidadServicio, cargarServiciosDeVuelo, eliminarServicio as eliminarServicioApi,
  formatearPrecio, formatearServicioParaSelect, guardarServicio as guardarServicioApi
} from '../services/serviciosVuelos';
import {
  NIVELES_PILOTO, actualizarPiloto, agregarDisponibilidad, eliminarDisponibilidad, listarBloques,
  listarDisponibilidad, listarPilotos
} from '../services/pilotosApi';
import { cambiarEstadoUsuario, crearUsuario, listarUsuarios } from '../services/usuariosApi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const normalizarTexto = (valor = '') => valor.toString().trim().toLowerCase();

// Clase visual del estado (las píldoras existentes: pendiente, confirmada, ejecutada, cancelada)
const CLASE_ESTADO = {
  Pendiente: 'pendiente',
  Confirmada: 'confirmada',
  Asignada: 'confirmada',
  Ejecutada: 'ejecutada',
  Cancelada: 'cancelada',
  Expirada: 'cancelada'
};

const SERVICIO_VACIO = { id: '', titulo: '', precio: '', descripcion: '', imagen: '', duracionMinutos: 15 };

const USUARIO_VACIO = {
  rol: 'Piloto',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  piloto: { numeroLicencia: '', nivelCertificacion: 'Piloto biplaza', fechaVencCertificacion: '', horasVuelo: 0, pesoKg: '' }
};

const EQUIPO_VACIO = {
  id: '',
  identificador: '',
  marca: '',
  modelo: '',
  tipo: 'Biplaza',
  pesoMinimo: '',
  pesoMaximo: '',
  fechaUltimaRevision: '',
  fechaProximaRevision: '',
  estado: 'Disponible'
};

// Píldora de color según el estado del equipo
const CLASE_ESTADO_EQUIPO = {
  Disponible: 'confirmada',
  'En mantenimiento': 'pendiente',
  'Fuera de servicio': 'cancelada'
};

const DIAS_ALERTA_REVISION = 30;

const ESTILO_ERROR_MODAL = { background: '#fdecea', color: '#a12622', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' };

const formatearFechaCreacion = (valor) => (valor ? valor.slice(0, 10).split('-').reverse().join('/') : 'Sin registro');

const hoyLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

export const AdminPanel = () => {
  const { usuario } = useAuth();
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }

  // Reservas
  const [reservas, setReservas] = useState([]);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [bloquesEdicion, setBloquesEdicion] = useState([]);
  const [reservaPago, setReservaPago] = useState(null);
  const [datosPago, setDatosPago] = useState({ medioPago: 'Nequi', comprobante: '' });
  const [busquedaReservas, setBusquedaReservas] = useState('');
  const [filtroFechaReserva, setFiltroFechaReserva] = useState('');
  const [filtroEstadoReserva, setFiltroEstadoReserva] = useState('');
  const [filtroTipoReserva, setFiltroTipoReserva] = useState('');
  const [ordenFechaReserva, setOrdenFechaReserva] = useState('desc');

  // Servicios
  const [servicios, setServicios] = useState([]);
  const [servicioEditando, setServicioEditando] = useState(null);

  // Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioNuevo, setUsuarioNuevo] = useState(null);

  // Equipos de vuelo
  const [equipos, setEquipos] = useState([]);
  const [equipoEditando, setEquipoEditando] = useState(null);

  // Pilotos
  const [pilotos, setPilotos] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [pilotoEditando, setPilotoEditando] = useState(null);
  const [pilotoDisponibilidad, setPilotoDisponibilidad] = useState(null); // { piloto, lista, fecha, idBloques }
  const [errorModal, setErrorModal] = useState('');

  // Asignación piloto + equipo
  const [asignando, setAsignando] = useState(null); // { reserva, datos, cargando }
  const [eleccionManual, setEleccionManual] = useState({ clave: '', justificacion: '' });

  const mostrarError = (error) => setMensaje({ tipo: 'error', texto: error.message || String(error) });
  const mostrarOk = (texto) => setMensaje({ tipo: 'ok', texto });

  // --- CARGA DE DATOS ---
  const cargarReservas = useCallback(() => listarReservas().then(setReservas), []);
  const cargarServicios = useCallback(() => cargarServiciosDeVuelo().then(setServicios), []);
  const cargarUsuarios = useCallback(() => listarUsuarios().then(setUsuarios), []);
  const cargarEquipos = useCallback(() => listarEquipos().then(setEquipos), []);
  const cargarPilotos = useCallback(() => listarPilotos().then(setPilotos), []);

  useEffect(() => {
    Promise.all([cargarReservas(), cargarServicios(), cargarUsuarios(), cargarEquipos(), cargarPilotos(), listarBloques().then(setBloques)])
      .catch((error) => setMensaje({ tipo: 'error', texto: error.message }));
  }, [cargarReservas, cargarServicios, cargarUsuarios, cargarEquipos, cargarPilotos]);

  // Cupos del día elegido en el modal de edición
  useEffect(() => {
    if (!reservaEditando?.fecha) return undefined;
    const controlador = new AbortController();
    consultarDisponibilidad(reservaEditando.fecha, controlador.signal)
      .then(setBloquesEdicion)
      .catch(() => {});
    return () => controlador.abort();
  }, [reservaEditando?.fecha]);

  // --- ACCIONES SOBRE RESERVAS ---
  const guardarCambios = async (e) => {
    e.preventDefault();
    try {
      await actualizarReserva(reservaEditando.id, {
        idServicio: Number(reservaEditando.idServicio),
        fecha: reservaEditando.fecha,
        idBloque: Number(reservaEditando.idBloque)
      });
      setReservaEditando(null);
      mostrarOk('Reserva reprogramada.');
      await cargarReservas();
    } catch (error) {
      mostrarError(error);
    }
  };

  const handleCancelar = async (reserva) => {
    if (!window.confirm(`¿Seguro que deseas cancelar la reserva ${reserva.codigo}?`)) return;
    try {
      await cambiarEstadoReserva(reserva.id, 'Cancelada');
      mostrarOk(`Reserva ${reserva.codigo} cancelada.`);
      await cargarReservas();
    } catch (error) {
      mostrarError(error);
    }
  };

  const confirmarPago = async (e) => {
    e.preventDefault();
    try {
      const { reserva } = await cambiarEstadoReserva(reservaPago.id, 'Confirmada', datosPago);
      setReservaPago(null);
      const correo = await enviarConfirmacionPago(reserva).catch(() => ({ enviado: false }));
      mostrarOk(`Pago confirmado${correo.enviado ? ' y correo enviado' : ' (no se envió el correo: revisa EmailJS)'}.`);
      await cargarReservas();
    } catch (error) {
      mostrarError(error);
    }
  };

  const marcarEjecutado = async (reserva) => {
    if (!window.confirm('¿Marcar vuelo como Ejecutado y enviar encuesta al cliente?')) return;
    try {
      const { reserva: actualizada, tokenEncuesta } = await cambiarEstadoReserva(reserva.id, 'Ejecutada');
      const correo = await enviarEncuesta(actualizada, tokenEncuesta).catch(() => ({ enviado: false }));
      mostrarOk(`Vuelo ejecutado${correo.enviado ? ' y encuesta enviada' : ` (encuesta: /encuesta/${tokenEncuesta})`}.`);
      await cargarReservas();
    } catch (error) {
      mostrarError(error);
    }
  };

  // --- CRUD SERVICIOS ---
  const guardarServicio = async (e) => {
    e.preventDefault();
    try {
      await guardarServicioApi(servicioEditando);
      setServicioEditando(null);
      mostrarOk('Servicio guardado.');
      await cargarServicios();
    } catch (error) {
      mostrarError(error);
    }
  };

  const eliminarServicio = async (servicio) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${servicio.titulo}"?`)) return;
    try {
      await eliminarServicioApi(servicio.id);
      mostrarOk('Servicio eliminado.');
      await cargarServicios();
    } catch (error) {
      mostrarError(error);
    }
  };

  const toggleServicioActivo = async (servicio) => {
    try {
      await cambiarVisibilidadServicio(servicio.id, !servicio.activo);
      await cargarServicios();
    } catch (error) {
      mostrarError(error);
    }
  };

  // --- USUARIOS (solo el administrador crea administradores y pilotos) ---
  const guardarUsuario = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...usuarioNuevo };
      if (datos.rol === 'Piloto') {
        datos.piloto = {
          ...datos.piloto,
          horasVuelo: Number(datos.piloto.horasVuelo) || 0,
          pesoKg: Number(datos.piloto.pesoKg)
        };
      } else {
        delete datos.piloto;
      }
      await crearUsuario(datos);
      setUsuarioNuevo(null);
      mostrarOk(`${datos.rol} creado. Comparte la contraseña inicial por un medio seguro.`);
      await Promise.all([cargarUsuarios(), cargarPilotos()]);
    } catch (error) {
      mostrarError(error);
    }
  };

  const toggleUsuarioActivo = async (u) => {
    try {
      await cambiarEstadoUsuario(u.idUsuario, !u.activo);
      await Promise.all([cargarUsuarios(), cargarPilotos()]);
    } catch (error) {
      mostrarError(error);
    }
  };

  // --- EQUIPOS DE VUELO (RF011, HU012) ---
  const guardarEquipo = async (e) => {
    e.preventDefault();
    if (Number(equipoEditando.pesoMaximo) <= Number(equipoEditando.pesoMinimo)) {
      mostrarError(new Error('El peso máximo debe ser mayor que el peso mínimo.'));
      return;
    }
    if (equipoEditando.fechaProximaRevision <= equipoEditando.fechaUltimaRevision) {
      mostrarError(new Error('La próxima revisión debe ser posterior a la última revisión.'));
      return;
    }
    try {
      const esNuevo = !equipoEditando.id;
      await guardarEquipoApi(equipoEditando);
      setEquipoEditando(null);
      mostrarOk(esNuevo ? 'Equipo registrado.' : 'Equipo actualizado.');
      await cargarEquipos();
    } catch (error) {
      mostrarError(error);
    }
  };

  const cambiarEstadoDeEquipo = async (equipo, estado) => {
    if (estado === equipo.estado) return;
    try {
      await cambiarEstadoEquipo(equipo.id, estado);
      mostrarOk(`${equipo.identificador} ahora está ${estado.toLowerCase()}.`);
      await cargarEquipos();
    } catch (error) {
      mostrarError(error);
    }
  };

  const cambiarCampoEquipo = (campo, valor) => setEquipoEditando((actual) => ({ ...actual, [campo]: valor }));

  // --- PILOTOS: ficha y disponibilidad (RF012) ---
  const guardarPiloto = async (e) => {
    e.preventDefault();
    try {
      await actualizarPiloto(pilotoEditando.id, pilotoEditando);
      setPilotoEditando(null);
      mostrarOk('Ficha del piloto actualizada.');
      await Promise.all([cargarPilotos(), cargarUsuarios()]);
    } catch (error) {
      mostrarError(error);
    }
  };

  const abrirDisponibilidad = async (piloto) => {
    setErrorModal('');
    try {
      const lista = await listarDisponibilidad(piloto.id);
      setPilotoDisponibilidad({ piloto, lista, fecha: '', idBloques: [] });
    } catch (error) {
      mostrarError(error);
    }
  };

  const alternarBloque = (idBloque) => setPilotoDisponibilidad((actual) => ({
    ...actual,
    idBloques: actual.idBloques.includes(idBloque)
      ? actual.idBloques.filter((b) => b !== idBloque)
      : [...actual.idBloques, idBloque]
  }));

  const guardarDisponibilidad = async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (pilotoDisponibilidad.idBloques.length === 0) {
      setErrorModal('Selecciona al menos un bloque horario.');
      return;
    }
    try {
      const lista = await agregarDisponibilidad(pilotoDisponibilidad.piloto.id, pilotoDisponibilidad.fecha, pilotoDisponibilidad.idBloques);
      setPilotoDisponibilidad((actual) => ({ ...actual, lista, idBloques: [] }));
    } catch (error) {
      setErrorModal(error.message);
    }
  };

  const quitarDisponibilidad = async (item) => {
    setErrorModal('');
    try {
      await eliminarDisponibilidad(pilotoDisponibilidad.piloto.id, item.id);
      setPilotoDisponibilidad((actual) => ({ ...actual, lista: actual.lista.filter((d) => d.id !== item.id) }));
    } catch (error) {
      setErrorModal(error.message);
    }
  };

  // Agrupa la disponibilidad por fecha para mostrarla compacta
  const disponibilidadPorFecha = useMemo(() => {
    const grupos = {};
    (pilotoDisponibilidad?.lista || []).forEach((d) => { (grupos[d.fecha] ||= []).push(d); });
    return Object.entries(grupos);
  }, [pilotoDisponibilidad?.lista]);

  // --- ASIGNACIÓN PILOTO + EQUIPO (RF013) ---
  const abrirAsignacion = async (reserva) => {
    setErrorModal('');
    setEleccionManual({ clave: '', justificacion: '' });
    setAsignando({ reserva, datos: null, cargando: true });
    try {
      const datos = await obtenerRecomendacion(reserva.id);
      setAsignando({ reserva, datos, cargando: false });
    } catch (error) {
      setAsignando(null);
      mostrarError(error);
    }
  };

  const confirmarAsignacion = async (combinacion, justificacion = '') => {
    setErrorModal('');
    try {
      const { asignacion } = await crearAsignacion({
        idReserva: asignando.reserva.id,
        idPiloto: combinacion.piloto.id,
        idEquipo: combinacion.equipo.id,
        justificacion
      });
      setAsignando(null);
      mostrarOk(`Reserva ${asignando.reserva.codigo} asignada a ${asignacion.piloto} con ${asignacion.equipo}.`);
      await cargarReservas();
    } catch (error) {
      setErrorModal(error.message);
    }
  };

  const asignarManual = (e) => {
    e.preventDefault();
    const combinacion = asignando.datos.combinacionesValidas.find((c) => `${c.piloto.id}-${c.equipo.id}` === eleccionManual.clave);
    if (!combinacion) {
      setErrorModal('Elige una combinación de piloto y equipo.');
      return;
    }
    confirmarAsignacion(combinacion, eleccionManual.justificacion);
  };

  // Días que faltan para la próxima revisión (negativo si ya venció)
  const diasParaRevision = (fecha) => Math.round((new Date(`${fecha}T00:00:00`) - new Date(`${hoyLocal()}T00:00:00`)) / 86400000);

  const cambiarCampoUsuario = (campo, valor) => setUsuarioNuevo((actual) => ({ ...actual, [campo]: valor }));
  const cambiarCampoPiloto = (campo, valor) => setUsuarioNuevo((actual) => ({ ...actual, piloto: { ...actual.piloto, [campo]: valor } }));

  // --- DATOS DERIVADOS ---
  const tiposReserva = useMemo(
    () => [...new Set(reservas.map((r) => r.servicio).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [reservas]
  );

  const contar = (estados) => reservas.filter((r) => estados.includes(r.estado)).length;
  const resumenReservas = {
    total: reservas.length,
    pendientes: contar(['Pendiente']),
    confirmadas: contar(['Confirmada', 'Asignada']),
    ejecutadas: contar(['Ejecutada']),
    canceladas: contar(['Cancelada', 'Expirada'])
  };

  const reservasFiltradas = useMemo(() => {
    const busqueda = normalizarTexto(busquedaReservas);
    return reservas
      .filter((r) => {
        const coincideBusqueda = !busqueda
          || normalizarTexto(r.cliente.nombreCompleto).includes(busqueda)
          || normalizarTexto(r.cliente.numeroDocumento).includes(busqueda)
          || normalizarTexto(r.codigo).includes(busqueda);
        const coincideFecha = !filtroFechaReserva || r.fecha === filtroFechaReserva;
        const coincideEstado = !filtroEstadoReserva || CLASE_ESTADO[r.estado] === filtroEstadoReserva;
        const coincideTipo = !filtroTipoReserva || r.servicio === filtroTipoReserva;
        return coincideBusqueda && coincideFecha && coincideEstado && coincideTipo;
      })
      .sort((a, b) => {
        const diferencia = a.fechaCreacion.localeCompare(b.fechaCreacion);
        return ordenFechaReserva === 'asc' ? diferencia : -diferencia;
      });
  }, [reservas, busquedaReservas, filtroFechaReserva, filtroEstadoReserva, filtroTipoReserva, ordenFechaReserva]);

  const ejecutados = resumenReservas.ejecutadas;
  const cancelados = resumenReservas.canceladas;
  const pendientes = resumenReservas.pendientes;

  // Satisfacción: 4 o 5 estrellas = satisfecho
  const encuestasRespondidas = reservas.filter((r) => r.encuesta);
  const satisfechos = encuestasRespondidas.filter((r) => r.encuesta.satisfaccion >= 4).length;
  const noSatisfechos = encuestasRespondidas.length - satisfechos;
  const satisfaccionPorcentaje = encuestasRespondidas.length > 0
    ? Math.round((satisfechos / encuestasRespondidas.length) * 100)
    : 0;

  const totalValidas = resumenReservas.total;
  const porcentajeEjecutadas = totalValidas > 0 ? ((ejecutados / totalValidas) * 100).toFixed(1) : 0;

  const datosBarra = {
    labels: ['Ejecutados', 'Cancelados', 'Pendientes'],
    datasets: [{ label: 'Vuelos', data: [ejecutados, cancelados, pendientes], backgroundColor: ['#4FB3FF', '#e74c3c', '#FFB703'] }]
  };
  const datosSatisfaccion = {
    labels: ['Satisfechos', 'No Satisfechos'],
    datasets: [{
      data: encuestasRespondidas.length > 0 ? [satisfechos, noSatisfechos] : [1],
      backgroundColor: encuestasRespondidas.length > 0 ? ['#2ecc71', '#e74c3c'] : ['#eef2f6']
    }]
  };
  const datosPromedio = {
    labels: ['Ejecutadas', 'Otras'],
    datasets: [{ data: [ejecutados, totalValidas - ejecutados], backgroundColor: ['#FFB703', '#eef2f6'] }]
  };

  const itemMenu = (vista, texto, icono) => (
    <button
      type="button"
      className={`menu-item ${vistaActual === vista ? 'active' : ''}`}
      onClick={() => setVistaActual(vista)}
      aria-current={vistaActual === vista ? 'page' : undefined}
      data-cy={`menu-${vista}`}
    >
      <i className={`bi ${icono}`} aria-hidden="true"></i>
      <span>{texto}</span>
    </button>
  );

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <p className="sidebar-titulo">Administración</p>
        {itemMenu('dashboard', 'Indicadores', 'bi-bar-chart-line')}
        {itemMenu('vuelos', 'Reservas', 'bi-journal-check')}
        {itemMenu('servicios', 'Servicios de vuelo', 'bi-tag')}
        {itemMenu('equipos', 'Equipos de vuelo', 'bi-wind')}
        {itemMenu('pilotos', 'Pilotos', 'bi-person-badge')}
        {itemMenu('usuarios', 'Usuarios', 'bi-people')}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="content">
        {mensaje && (
          <div className={`panel-mensaje panel-mensaje-${mensaje.tipo}`} data-cy="panel-mensaje">
            <span>{mensaje.texto}</span>
            <button type="button" onClick={() => setMensaje(null)} aria-label="Cerrar mensaje">✕</button>
          </div>
        )}

        {vistaActual === 'dashboard' && (
          <div className="card">
            <div className="vista-encabezado">
              <div>
                <h2>Indicadores</h2>
                <p>Resumen de las reservas y de la satisfacción de los clientes.</p>
              </div>
            </div>
            <div className="indicadores">
              <div><span>Vuelos ejecutados</span><strong>{ejecutados}</strong></div>
              <div><span>Cancelados</span><strong>{cancelados}</strong></div>
              <div><span>Pendientes de pago</span><strong>{pendientes}</strong></div>
              <div><span>Satisfacción</span><strong>{satisfaccionPorcentaje}%</strong></div>
              <div><span>Reservas ejecutadas</span><strong>{porcentajeEjecutadas}%</strong></div>
            </div>

            <div className="graficas">
              <figure><figcaption>Estado de los vuelos</figcaption><div className="grafica"><Bar data={datosBarra} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div></figure>
              <figure><figcaption>Satisfacción de los clientes</figcaption><div className="grafica"><Doughnut data={datosSatisfaccion} options={{ maintainAspectRatio: false }} /></div></figure>
              <figure><figcaption>Reservas ejecutadas del total</figcaption><div className="grafica"><Doughnut data={datosPromedio} options={{ maintainAspectRatio: false }} /></div></figure>
            </div>
          </div>
        )}

        {vistaActual === 'vuelos' && (
          <div className="reservas-view">
            <div className="vista-encabezado">
              <div>
                <h2>Reservas</h2>
                <p>Confirma el pago cuando lo recibas por WhatsApp, asigna piloto y equipo, y marca el vuelo al terminar.</p>
              </div>
            </div>

            <div className="reservation-summary-grid">
              <div className="reservation-summary-card"><span>Total reservas</span><strong>{resumenReservas.total}</strong></div>
              <div className="reservation-summary-card"><span>Pendientes</span><strong>{resumenReservas.pendientes}</strong></div>
              <div className="reservation-summary-card"><span>Confirmadas</span><strong>{resumenReservas.confirmadas}</strong></div>
              <div className="reservation-summary-card"><span>Ejecutadas</span><strong>{resumenReservas.ejecutadas}</strong></div>
              <div className="reservation-summary-card"><span>Canceladas</span><strong>{resumenReservas.canceladas}</strong></div>
            </div>

            <div className="reservation-filters">
              <div className="reservation-search">
                <input type="search" value={busquedaReservas} onChange={(e) => setBusquedaReservas(e.target.value)} placeholder="Buscar nombre, cédula o código" data-cy="admin-buscar" />
              </div>
              <input type="date" value={filtroFechaReserva} onChange={(e) => setFiltroFechaReserva(e.target.value)} title="Filtrar por fecha de vuelo" />
              <button type="button" className="sort-date-button" onClick={() => setOrdenFechaReserva(ordenFechaReserva === 'desc' ? 'asc' : 'desc')} title="Ordenar por fecha de creación">
                {ordenFechaReserva === 'desc' ? 'Fecha reciente' : 'Fecha antigua'}
              </button>
              <select value={filtroEstadoReserva} onChange={(e) => setFiltroEstadoReserva(e.target.value)} title="Filtrar por estado">
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmada">Confirmadas / asignadas</option>
                <option value="ejecutada">Ejecutadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
              <select value={filtroTipoReserva} onChange={(e) => setFiltroTipoReserva(e.target.value)} title="Filtrar por tipo de vuelo">
                <option value="">Todos los tipos</option>
                {tiposReserva.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>

            <div className="reservations-table-card">
              <div className="reservations-table-wrap">
                <table className="reservations-table" data-cy="tabla-reservas">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Creada</th>
                      <th>Nombre</th>
                      <th>Documento</th>
                      <th>Tipo</th>
                      <th>Vuelo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.map((r) => (
                      <tr key={r.id} data-cy={`fila-${r.codigo}`}>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.codigo}</td>
                        <td>{formatearFechaCreacion(r.fechaCreacion)}</td>
                        <td className="reservation-name-cell">
                          {r.cliente.nombreCompleto}
                          {r.cliente.tieneCuenta && <span title="Cliente con cuenta"> 👤</span>}
                        </td>
                        <td>{r.cliente.numeroDocumento}</td>
                        <td>{r.servicio}</td>
                        <td className="sin-salto">{r.fecha}<br /><span className="texto-suave">{r.hora}</span></td>
                        <td><span className={`status-pill status-pill-${CLASE_ESTADO[r.estado]}`}>{r.estado}</span></td>
                        <td className="actions">
                          {r.estado === 'Pendiente' && (
                            <button onClick={() => { setReservaPago(r); setDatosPago({ medioPago: 'Nequi', comprobante: '' }); }} data-cy="btn-confirmar-pago" className="accion-btn accion-ok" data-tip="Confirmar pago" aria-label="Confirmar pago"><i className="bi bi-cash-coin" aria-hidden="true"></i></button>
                          )}
                          {r.estado === 'Confirmada' && (
                            <button onClick={() => abrirAsignacion(r)} data-cy="btn-asignar" className="accion-btn accion-principal" data-tip="Asignar piloto y equipo" aria-label="Asignar piloto y equipo"><i className="bi bi-person-gear" aria-hidden="true"></i></button>
                          )}
                          {['Confirmada', 'Asignada'].includes(r.estado) && (
                            <button onClick={() => marcarEjecutado(r)} data-cy="btn-ejecutar" className="accion-btn" data-tip="Marcar como ejecutado" aria-label="Marcar como ejecutado"><i className="bi bi-flag" aria-hidden="true"></i></button>
                          )}
                          {['Pendiente', 'Confirmada', 'Asignada'].includes(r.estado) && (
                            <>
                              <button onClick={() => setReservaEditando({ id: r.id, codigo: r.codigo, idServicio: r.idServicio, fecha: r.fecha, idBloque: r.idBloque })} data-cy="btn-editar" className="accion-btn" data-tip="Reprogramar" aria-label="Reprogramar"><i className="bi bi-calendar2-event" aria-hidden="true"></i></button>
                              <button onClick={() => handleCancelar(r)} data-cy="btn-cancelar" className="accion-btn accion-peligro" data-tip="Cancelar reserva" aria-label="Cancelar reserva"><i className="bi bi-x-circle" aria-hidden="true"></i></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}

                    {reservasFiltradas.length === 0 && (
                      <tr><td colSpan="8" className="empty-reservations">No hay reservas que coincidan con los filtros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {vistaActual === 'servicios' && (
          <div className="card">
            <div className="vista-encabezado">
              <div>
                <h2>Servicios de vuelo</h2>
                <p>Los servicios visibles aparecen en el catálogo y en el formulario de reserva.</p>
              </div>
              <button onClick={() => setServicioEditando({ ...SERVICIO_VACIO })} className="btn-accion-principal" data-cy="btn-nuevo-servicio">
                <i className="bi bi-plus-lg" aria-hidden="true"></i> Nuevo servicio
              </button>
            </div>

            <div className="reservations-table-wrap">
              <table className="reservations-table" data-cy="tabla-servicios">
                <thead>
                  <tr><th>Imagen</th><th>Título</th><th>Precio</th><th>Duración</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {servicios.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.imagen
                          ? <img src={s.imagen} alt={s.titulo} className="miniatura" />
                          : <span className="texto-suave">Sin imagen</span>}
                      </td>
                      <td className="reservation-name-cell">{s.titulo}</td>
                      <td>{formatearPrecio(s.precio)}</td>
                      <td>{s.duracionMinutos} min</td>
                      <td><span className={`status-pill status-pill-${s.activo ? 'confirmada' : 'cancelada'}`}>{s.activo ? 'Visible' : 'Oculto'}</span></td>
                      <td className="actions">
                        <button onClick={() => toggleServicioActivo(s)} className="accion-btn" data-tip={s.activo ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'} aria-label={s.activo ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}>
                          <i className={`bi ${s.activo ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true"></i>
                        </button>
                        <button onClick={() => setServicioEditando({ ...s, imagen: s.imagen || '', descripcion: s.descripcion || '' })} className="accion-btn" data-tip="Editar servicio" aria-label="Editar servicio">
                          <i className="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button onClick={() => eliminarServicio(s)} className="accion-btn accion-peligro" data-tip="Eliminar servicio" aria-label="Eliminar servicio">
                          <i className="bi bi-trash3" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vistaActual === 'equipos' && (
          <div className="card">
            <div className="vista-encabezado">
              <div>
                <h2>Equipos de vuelo</h2>
                <p>Solo los equipos disponibles y con la revisión al día se pueden asignar a un vuelo.</p>
              </div>
              <button onClick={() => setEquipoEditando({ ...EQUIPO_VACIO })} className="btn-accion-principal" data-cy="btn-nuevo-equipo">
                <i className="bi bi-plus-lg" aria-hidden="true"></i> Nuevo equipo
              </button>
            </div>

            <div className="reservations-table-wrap">
              <table className="reservations-table" data-cy="tabla-equipos">
                <thead>
                  <tr><th>Identificador</th><th>Equipo</th><th>Peso combinado</th><th>Última revisión</th><th>Próxima revisión</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {equipos.length === 0 && (
                    <tr><td colSpan={7}>No hay equipos registrados.</td></tr>
                  )}
                  {equipos.map((eq) => {
                    const dias = diasParaRevision(eq.fechaProximaRevision);
                    return (
                      <tr key={eq.id} data-cy={`fila-equipo-${eq.identificador}`}>
                        <td className="reservation-name-cell">{eq.identificador}</td>
                        <td>
                          {eq.marca} {eq.modelo}
                          <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>{eq.tipo}</div>
                        </td>
                        <td>{eq.pesoMinimo} a {eq.pesoMaximo} kg</td>
                        <td>{eq.fechaUltimaRevision}</td>
                        <td>
                          {eq.fechaProximaRevision}
                          {dias < 0 && <div style={{ color: '#c0392b', fontSize: '0.8rem', fontWeight: 'bold' }}>Revisión vencida</div>}
                          {dias >= 0 && dias <= DIAS_ALERTA_REVISION && <div style={{ color: '#d68910', fontSize: '0.8rem', fontWeight: 'bold' }}>Vence en {dias} días</div>}
                        </td>
                        <td><span className={`status-pill status-pill-${CLASE_ESTADO_EQUIPO[eq.estado]}`}>{eq.estado}</span></td>
                        <td className="actions">
                          <select value={eq.estado} onChange={(e) => cambiarEstadoDeEquipo(eq, e.target.value)} data-cy="equipo-cambiar-estado" title="Cambiar estado" className="select-compacto">
                            {ESTADOS_EQUIPO.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                          </select>
                          <button onClick={() => setEquipoEditando({ ...eq })} data-cy="btn-editar-equipo" className="accion-btn" data-tip="Editar equipo" aria-label="Editar equipo"><i className="bi bi-pencil" aria-hidden="true"></i></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vistaActual === 'pilotos' && (
          <div className="card">
            <div className="vista-encabezado">
              <div>
                <h2>Pilotos</h2>
                <p>Los pilotos se crean en Usuarios. Aquí se edita su ficha y se registra en qué fechas y horas pueden volar.</p>
              </div>
            </div>

            <div className="reservations-table-wrap">
              <table className="reservations-table" data-cy="tabla-pilotos">
                <thead>
                  <tr><th>Piloto</th><th>Licencia</th><th>Certificación</th><th>Horas</th><th>Peso</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {pilotos.length === 0 && (
                    <tr><td colSpan={7}>No hay pilotos registrados. Créalos en Usuarios.</td></tr>
                  )}
                  {pilotos.map((p) => {
                    const dias = diasParaRevision(p.fechaVencCertificacion);
                    const puedeVolar = p.activo && p.disponible && dias >= 0;
                    return (
                      <tr key={p.id} data-cy={`fila-piloto-${p.id}`}>
                        <td className="reservation-name-cell">
                          {p.nombreCompleto}
                          <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>{p.correo}</div>
                        </td>
                        <td>{p.numeroLicencia}</td>
                        <td>
                          {p.nivelCertificacion}
                          <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>vence {p.fechaVencCertificacion}</div>
                          {dias < 0 && <div style={{ color: '#c0392b', fontSize: '0.8rem', fontWeight: 'bold' }}>Certificación vencida</div>}
                          {dias >= 0 && dias <= DIAS_ALERTA_REVISION && <div style={{ color: '#d68910', fontSize: '0.8rem', fontWeight: 'bold' }}>Vence en {dias} días</div>}
                        </td>
                        <td>{p.horasVuelo}</td>
                        <td>{p.pesoKg} kg</td>
                        <td>
                          <span className={`status-pill status-pill-${puedeVolar ? 'confirmada' : 'cancelada'}`}>
                            {!p.activo ? 'Cuenta inactiva' : !p.disponible ? 'No disponible' : dias < 0 ? 'No apto' : 'Apto'}
                          </span>
                        </td>
                        <td className="actions">
                          <button onClick={() => abrirDisponibilidad(p)} data-cy="btn-disponibilidad" className="accion-btn accion-ok" data-tip="Disponibilidad" aria-label="Disponibilidad"><i className="bi bi-calendar-week" aria-hidden="true"></i></button>
                          <button onClick={() => setPilotoEditando({ ...p })} data-cy="btn-editar-piloto" className="accion-btn" data-tip="Editar ficha" aria-label="Editar ficha"><i className="bi bi-pencil" aria-hidden="true"></i></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vistaActual === 'usuarios' && (
          <div className="card">
            <div className="vista-encabezado">
              <div>
                <h2>Usuarios</h2>
                <p>Solo un administrador crea administradores y pilotos. Los clientes se registran desde la página.</p>
              </div>
              <button onClick={() => setUsuarioNuevo(structuredClone(USUARIO_VACIO))} className="btn-accion-principal" data-cy="btn-nuevo-usuario">
                <i className="bi bi-plus-lg" aria-hidden="true"></i> Nuevo usuario
              </button>
            </div>

            <div className="reservations-table-wrap">
              <table className="reservations-table" data-cy="tabla-usuarios">
                <thead>
                  <tr><th>Nombre</th><th>Rol</th><th>Correo</th><th>Documento</th><th>Licencia</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.idUsuario}>
                      <td className="reservation-name-cell">{u.nombres} {u.apellidos}</td>
                      <td>{u.rol}</td>
                      <td>{u.correo}</td>
                      <td>{u.tipoDocumento} {u.numeroDocumento}</td>
                      <td>{u.piloto ? `${u.piloto.numeroLicencia} (vence ${u.piloto.fechaVencCertificacion})` : '—'}</td>
                      <td><span className={`status-pill status-pill-${u.activo ? 'confirmada' : 'cancelada'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="actions">
                        {u.idUsuario !== usuario?.idUsuario && (
                          <button onClick={() => toggleUsuarioActivo(u)} className={`accion-btn accion-texto ${u.activo ? 'accion-peligro' : 'accion-ok'}`}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR PAGO */}
      {reservaPago && (
        <div className="modal">
          <div className="modal-content" style={{ width: '400px' }}>
            <h3>Confirmar pago de {reservaPago.codigo}</h3>
            <p>{reservaPago.cliente.nombreCompleto} · {reservaPago.servicio} · {formatearPrecio(reservaPago.valorTotal)}</p>
            <form onSubmit={confirmarPago} data-cy="form-pago">
              <select value={datosPago.medioPago} onChange={(e) => setDatosPago({ ...datosPago, medioPago: e.target.value })} data-cy="pago-medio" required>
                {MEDIOS_PAGO.map((medio) => <option key={medio} value={medio}>{medio}</option>)}
              </select>
              <input type="text" placeholder="Referencia del comprobante (opcional)" value={datosPago.comprobante} onChange={(e) => setDatosPago({ ...datosPago, comprobante: e.target.value })} maxLength={100} />
              <button type="submit" style={{ width: '100%' }} data-cy="pago-confirmar">Confirmar pago</button>
              <button type="button" onClick={() => setReservaPago(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR RESERVA */}
      {reservaEditando && (
        <div className="modal">
          <div className="modal-content">
            <h3>Reprogramar {reservaEditando.codigo}</h3>
            <form onSubmit={guardarCambios}>
              <select value={reservaEditando.idServicio} onChange={(e) => setReservaEditando({ ...reservaEditando, idServicio: e.target.value })} required>
                {servicios.filter((s) => s.activo || s.id === Number(reservaEditando.idServicio)).map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {formatearServicioParaSelect(servicio)}{servicio.activo ? '' : ' (oculto)'}
                  </option>
                ))}
              </select>
              <input type="date" value={reservaEditando.fecha} min={hoyLocal()} onChange={(e) => setReservaEditando({ ...reservaEditando, fecha: e.target.value })} required />
              <select value={reservaEditando.idBloque} onChange={(e) => setReservaEditando({ ...reservaEditando, idBloque: e.target.value })} required>
                {bloquesEdicion.map((b) => (
                  <option key={b.idBloque} value={b.idBloque}>{b.horaInicio} ({b.disponibles} cupos)</option>
                ))}
              </select>
              <button type="submit" style={{ width: '100%' }}>Guardar cambios</button>
              <button type="button" onClick={() => setReservaEditando(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR/CREAR SERVICIO */}
      {servicioEditando && (
        <div className="modal">
          <div className="modal-content" style={{ width: '400px' }}>
            <h3>{servicioEditando.id ? 'Editar' : 'Nuevo'} servicio</h3>
            <form onSubmit={guardarServicio}>
              <input type="text" placeholder="Título (Ej: Vuelo Extremo)" value={servicioEditando.titulo} onChange={(e) => setServicioEditando({ ...servicioEditando, titulo: e.target.value })} required />
              <input type="number" placeholder="Precio (Ej: 250000)" min="1" value={servicioEditando.precio} onChange={(e) => setServicioEditando({ ...servicioEditando, precio: e.target.value })} required />
              <input type="number" placeholder="Duración en minutos" min="5" max="240" value={servicioEditando.duracionMinutos} onChange={(e) => setServicioEditando({ ...servicioEditando, duracionMinutos: e.target.value })} required />
              <textarea placeholder="Descripción breve" value={servicioEditando.descripcion} onChange={(e) => setServicioEditando({ ...servicioEditando, descripcion: e.target.value })} required style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <input type="url" placeholder="URL de la imagen (Ej: https://...)" value={servicioEditando.imagen} onChange={(e) => setServicioEditando({ ...servicioEditando, imagen: e.target.value })} required />
              <button type="submit" style={{ width: '100%' }}>Guardar</button>
              <button type="button" onClick={() => setServicioEditando(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR/EDITAR EQUIPO */}
      {equipoEditando && (
        <div className="modal">
          <div className="modal-content" style={{ width: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{equipoEditando.id ? `Editar ${equipoEditando.identificador}` : 'Nuevo equipo'}</h3>
            <form onSubmit={guardarEquipo} data-cy="form-equipo">
              <input placeholder="Identificador (Ej: EQ-004)" value={equipoEditando.identificador} onChange={(e) => cambiarCampoEquipo('identificador', e.target.value)} maxLength={20} data-cy="equipo-identificador" required />
              <input placeholder="Marca (Ej: Ozone)" value={equipoEditando.marca} onChange={(e) => cambiarCampoEquipo('marca', e.target.value)} maxLength={40} data-cy="equipo-marca" required />
              <input placeholder="Modelo (Ej: Magnum 3)" value={equipoEditando.modelo} onChange={(e) => cambiarCampoEquipo('modelo', e.target.value)} maxLength={40} data-cy="equipo-modelo" required />
              <select value={equipoEditando.tipo} onChange={(e) => cambiarCampoEquipo('tipo', e.target.value)} data-cy="equipo-tipo" required>
                {TIPOS_EQUIPO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
              <label style={{ fontSize: '0.85rem' }}>Rango de peso combinado (piloto + pasajero)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" placeholder="Mínimo (kg)" min="1" max="999" step="0.01" value={equipoEditando.pesoMinimo} onChange={(e) => cambiarCampoEquipo('pesoMinimo', e.target.value)} data-cy="equipo-peso-minimo" required />
                <input type="number" placeholder="Máximo (kg)" min="1" max="999" step="0.01" value={equipoEditando.pesoMaximo} onChange={(e) => cambiarCampoEquipo('pesoMaximo', e.target.value)} data-cy="equipo-peso-maximo" required />
              </div>
              <label style={{ fontSize: '0.85rem' }}>Última revisión</label>
              <input type="date" value={equipoEditando.fechaUltimaRevision} max={hoyLocal()} onChange={(e) => cambiarCampoEquipo('fechaUltimaRevision', e.target.value)} data-cy="equipo-ultima-revision" required />
              <label style={{ fontSize: '0.85rem' }}>Próxima revisión</label>
              <input type="date" value={equipoEditando.fechaProximaRevision} min={equipoEditando.fechaUltimaRevision || undefined} onChange={(e) => cambiarCampoEquipo('fechaProximaRevision', e.target.value)} data-cy="equipo-proxima-revision" required />
              <select value={equipoEditando.estado} onChange={(e) => cambiarCampoEquipo('estado', e.target.value)} data-cy="equipo-estado" required>
                {ESTADOS_EQUIPO.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
              <button type="submit" style={{ width: '100%' }} data-cy="equipo-guardar">Guardar</button>
              <button type="button" onClick={() => setEquipoEditando(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR FICHA DEL PILOTO */}
      {pilotoEditando && (
        <div className="modal">
          <div className="modal-content" style={{ width: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Ficha de {pilotoEditando.nombreCompleto}</h3>
            <form onSubmit={guardarPiloto} data-cy="form-piloto">
              <input placeholder="Número de licencia" value={pilotoEditando.numeroLicencia} onChange={(e) => setPilotoEditando({ ...pilotoEditando, numeroLicencia: e.target.value })} maxLength={20} data-cy="piloto-editar-licencia" required />
              <select value={pilotoEditando.nivelCertificacion} onChange={(e) => setPilotoEditando({ ...pilotoEditando, nivelCertificacion: e.target.value })} data-cy="piloto-editar-nivel" required>
                {NIVELES_PILOTO.map((nivel) => <option key={nivel} value={nivel}>{nivel}</option>)}
              </select>
              <label style={{ fontSize: '0.85rem' }}>Vencimiento de la certificación</label>
              <input type="date" value={pilotoEditando.fechaVencCertificacion} onChange={(e) => setPilotoEditando({ ...pilotoEditando, fechaVencCertificacion: e.target.value })} data-cy="piloto-editar-vencimiento" required />
              <label style={{ fontSize: '0.85rem' }}>Horas de vuelo</label>
              <input type="number" min="0" value={pilotoEditando.horasVuelo} onChange={(e) => setPilotoEditando({ ...pilotoEditando, horasVuelo: e.target.value })} data-cy="piloto-editar-horas" required />
              <label style={{ fontSize: '0.85rem' }}>Peso del piloto (kg)</label>
              <input type="number" min="40" max="150" step="0.01" value={pilotoEditando.pesoKg} onChange={(e) => setPilotoEditando({ ...pilotoEditando, pesoKg: e.target.value })} data-cy="piloto-editar-peso" required />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <input type="checkbox" checked={pilotoEditando.disponible} onChange={(e) => setPilotoEditando({ ...pilotoEditando, disponible: e.target.checked })} style={{ width: 'auto', margin: 0 }} data-cy="piloto-editar-disponible" />
                Disponible para volar
              </label>
              <button type="submit" style={{ width: '100%' }} data-cy="piloto-guardar">Guardar</button>
              <button type="button" onClick={() => setPilotoEditando(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DISPONIBILIDAD DEL PILOTO */}
      {pilotoDisponibilidad && (
        <div className="modal">
          <div className="modal-content" style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Disponibilidad de {pilotoDisponibilidad.piloto.nombreCompleto}</h3>

            <form onSubmit={guardarDisponibilidad} data-cy="form-disponibilidad">
              <label style={{ fontSize: '0.85rem' }}>Fecha</label>
              <input type="date" min={hoyLocal()} value={pilotoDisponibilidad.fecha} onChange={(e) => setPilotoDisponibilidad({ ...pilotoDisponibilidad, fecha: e.target.value })} data-cy="disp-fecha" required />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                <span style={{ fontSize: '0.85rem' }}>Bloques horarios</span>
                <button type="button" onClick={() => setPilotoDisponibilidad({ ...pilotoDisponibilidad, idBloques: bloques.map((b) => b.idBloque) })} style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem', margin: 0 }} data-cy="disp-todo-el-dia">Todo el día</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {bloques.map((b) => {
                  const marcado = pilotoDisponibilidad.idBloques.includes(b.idBloque);
                  return (
                    <button type="button" key={b.idBloque} onClick={() => alternarBloque(b.idBloque)} data-cy={`disp-bloque-${b.idBloque}`}
                      style={{ margin: 0, padding: '6px', fontSize: '0.8rem', background: marcado ? '#1a4a7c' : '#eef2f6', color: marcado ? 'white' : '#1a4a7c' }}>
                      {b.horaInicio}
                    </button>
                  );
                })}
              </div>
              {errorModal && <p style={ESTILO_ERROR_MODAL} data-cy="modal-error">{errorModal}</p>}
              <button type="submit" style={{ width: '100%' }} data-cy="disp-guardar">Agregar disponibilidad</button>
            </form>

            <h4 style={{ margin: '20px 0 10px' }}>Próximas fechas registradas</h4>
            {disponibilidadPorFecha.length === 0 && <p data-cy="disp-vacia">Este piloto no tiene disponibilidad registrada desde hoy.</p>}
            {disponibilidadPorFecha.map(([fecha, items]) => (
              <div key={fecha} style={{ marginBottom: '10px' }} data-cy={`disp-dia-${fecha}`}>
                <strong>{fecha}</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {items.map((d) => (
                    <span key={d.id} style={{ background: '#d4edda', color: '#155724', borderRadius: '14px', padding: '4px 6px 4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {d.horaInicio}
                      <button type="button" onClick={() => quitarDisponibilidad(d)} title="Quitar" style={{ margin: 0, padding: '0 6px', width: 'auto', background: 'transparent', color: '#a12622', fontSize: '0.8rem' }}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <button type="button" onClick={() => { setPilotoDisponibilidad(null); setErrorModal(''); }} className="btn-secundario" data-cy="disp-cerrar">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR PILOTO + EQUIPO (motor de recomendación) */}
      {asignando && (
        <div className="modal">
          <div className="modal-content" style={{ width: '640px', maxHeight: '90vh', overflowY: 'auto' }} data-cy="modal-asignacion">
            <h3>Asignar piloto y equipo · {asignando.reserva.codigo}</h3>
            {asignando.cargando && <p>Calculando recomendaciones...</p>}

            {asignando.datos && (
              <>
                <p style={{ margin: '0 0 12px' }}>
                  {asignando.datos.reserva.pasajero} · {asignando.datos.reserva.servicio} · {asignando.datos.reserva.fecha} {asignando.datos.reserva.hora}
                  <br />Peso del pasajero: <strong>{asignando.datos.reserva.peso} kg</strong> · Edad: {asignando.datos.reserva.edad}
                  {asignando.datos.reserva.observaciones && <><br />Observaciones: {asignando.datos.reserva.observaciones}</>}
                </p>

                {errorModal && <p style={ESTILO_ERROR_MODAL} data-cy="modal-error">{errorModal}</p>}

                {asignando.datos.motivo && (
                  <p style={{ ...ESTILO_ERROR_MODAL, background: '#fff4e5', color: '#8a5300' }} data-cy="asignacion-sin-opciones">{asignando.datos.motivo}</p>
                )}

                {asignando.datos.recomendaciones.map((c, i) => (
                  <div key={`${c.piloto.id}-${c.equipo.id}`} data-cy={`recomendacion-${i}`}
                    style={{ border: i === 0 ? '2px solid #f1c40f' : '1px solid #dde3ea', borderRadius: '10px', padding: '12px', marginBottom: '10px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <strong>{i === 0 ? '⭐ Recomendada: ' : `Opción ${i + 1}: `}{c.piloto.nombre} + {c.equipo.nombre}</strong>
                      <span className="puntaje">{c.puntaje} pts</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', margin: '6px 0' }}>{c.explicacion}</p>
                    {i === 0 && (
                      <button type="button" onClick={() => confirmarAsignacion(c)} data-cy="btn-aprobar-recomendacion" style={{ width: '100%', margin: 0 }}>Aprobar recomendación</button>
                    )}
                  </div>
                ))}

                {asignando.datos.combinacionesValidas.length > 1 && (
                  <form onSubmit={asignarManual} data-cy="form-asignacion-manual" style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '6px' }}>
                    <h4 style={{ margin: '0 0 8px' }}>Asignación manual</h4>
                    <select value={eleccionManual.clave} onChange={(e) => setEleccionManual({ ...eleccionManual, clave: e.target.value })} data-cy="asignacion-manual-opcion" required>
                      <option value="">Elige piloto y equipo</option>
                      {asignando.datos.combinacionesValidas.slice(1).map((c) => (
                        <option key={`${c.piloto.id}-${c.equipo.id}`} value={`${c.piloto.id}-${c.equipo.id}`}>
                          {c.piloto.nombre} + {c.equipo.identificador} ({c.puntaje} pts)
                        </option>
                      ))}
                    </select>
                    <textarea placeholder="Justificación (obligatoria si no aceptas la recomendación)" value={eleccionManual.justificacion} onChange={(e) => setEleccionManual({ ...eleccionManual, justificacion: e.target.value })} minLength={10} maxLength={300} required data-cy="asignacion-justificacion" style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    <button type="submit" className="btn-primario" data-cy="btn-asignar-manual">Asignar con justificación</button>
                  </form>
                )}
              </>
            )}

            <button type="button" onClick={() => { setAsignando(null); setErrorModal(''); }} className="btn-secundario">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL NUEVO USUARIO */}
      {usuarioNuevo && (
        <div className="modal">
          <div className="modal-content" style={{ width: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Nuevo usuario</h3>
            <form onSubmit={guardarUsuario} data-cy="form-usuario">
              <select value={usuarioNuevo.rol} onChange={(e) => cambiarCampoUsuario('rol', e.target.value)} data-cy="usuario-rol" required>
                <option value="Piloto">Piloto</option>
                <option value="Administrador">Administrador</option>
              </select>
              <select value={usuarioNuevo.tipoDocumento} onChange={(e) => cambiarCampoUsuario('tipoDocumento', e.target.value)} required>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="PA">Pasaporte</option>
                <option value="PPT">Permiso por protección temporal</option>
              </select>
              <input placeholder="Número de documento" value={usuarioNuevo.numeroDocumento} onChange={(e) => cambiarCampoUsuario('numeroDocumento', e.target.value)} data-cy="usuario-documento" required />
              <input placeholder="Nombres" value={usuarioNuevo.nombres} onChange={(e) => cambiarCampoUsuario('nombres', e.target.value)} data-cy="usuario-nombres" required />
              <input placeholder="Apellidos" value={usuarioNuevo.apellidos} onChange={(e) => cambiarCampoUsuario('apellidos', e.target.value)} data-cy="usuario-apellidos" required />
              <input type="email" placeholder="Correo" value={usuarioNuevo.correo} onChange={(e) => cambiarCampoUsuario('correo', e.target.value)} data-cy="usuario-correo" required />
              <input type="tel" placeholder="Teléfono (opcional)" value={usuarioNuevo.telefono} onChange={(e) => cambiarCampoUsuario('telefono', e.target.value)} />
              <input type="password" placeholder="Contraseña inicial (mín. 8, letras y números)" value={usuarioNuevo.contrasena} onChange={(e) => cambiarCampoUsuario('contrasena', e.target.value)} data-cy="usuario-contrasena" minLength={8} autoComplete="new-password" required />

              {usuarioNuevo.rol === 'Piloto' && (
                <>
                  <input placeholder="Número de licencia" value={usuarioNuevo.piloto.numeroLicencia} onChange={(e) => cambiarCampoPiloto('numeroLicencia', e.target.value)} data-cy="piloto-licencia" required />
                  <select value={usuarioNuevo.piloto.nivelCertificacion} onChange={(e) => cambiarCampoPiloto('nivelCertificacion', e.target.value)} required>
                    <option>Piloto biplaza</option>
                    <option>Instructor</option>
                    <option>Instructor examinador</option>
                  </select>
                  <label style={{ fontSize: '0.85rem' }}>Vencimiento de la certificación</label>
                  <input type="date" value={usuarioNuevo.piloto.fechaVencCertificacion} onChange={(e) => cambiarCampoPiloto('fechaVencCertificacion', e.target.value)} data-cy="piloto-vencimiento" required />
                  <input type="number" placeholder="Horas de vuelo" min="0" value={usuarioNuevo.piloto.horasVuelo} onChange={(e) => cambiarCampoPiloto('horasVuelo', e.target.value)} />
                  <input type="number" placeholder="Peso del piloto (kg)" min="40" max="150" value={usuarioNuevo.piloto.pesoKg} onChange={(e) => cambiarCampoPiloto('pesoKg', e.target.value)} data-cy="piloto-peso" required />
                </>
              )}

              <button type="submit" style={{ width: '100%' }} data-cy="usuario-guardar">Crear usuario</button>
              <button type="button" onClick={() => setUsuarioNuevo(null)} className="btn-secundario">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
