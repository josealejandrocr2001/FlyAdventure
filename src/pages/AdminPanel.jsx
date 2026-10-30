// Panel del Administrador: indicadores, reservas, servicios y usuarios.
// Todos los datos vienen de la API (MySQL); nada se escribe directo a la base de datos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css';
import { useAuth } from '../context/useAuth';
import { enviarConfirmacionPago, enviarEncuesta } from '../services/notificaciones';
import {
  MEDIOS_PAGO, actualizarReserva, cambiarEstadoReserva, consultarDisponibilidad, listarReservas
} from '../services/reservasApi';
import {
  cambiarVisibilidadServicio, cargarServiciosDeVuelo, eliminarServicio as eliminarServicioApi,
  formatearPrecio, formatearServicioParaSelect, guardarServicio as guardarServicioApi
} from '../services/serviciosVuelos';
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

  const mostrarError = (error) => setMensaje({ tipo: 'error', texto: error.message || String(error) });
  const mostrarOk = (texto) => setMensaje({ tipo: 'ok', texto });

  // --- CARGA DE DATOS ---
  const cargarReservas = useCallback(() => listarReservas().then(setReservas), []);
  const cargarServicios = useCallback(() => cargarServiciosDeVuelo().then(setServicios), []);
  const cargarUsuarios = useCallback(() => listarUsuarios().then(setUsuarios), []);

  useEffect(() => {
    Promise.all([cargarReservas(), cargarServicios(), cargarUsuarios()])
      .catch((error) => setMensaje({ tipo: 'error', texto: error.message }));
  }, [cargarReservas, cargarServicios, cargarUsuarios]);

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
      await cargarUsuarios();
    } catch (error) {
      mostrarError(error);
    }
  };

  const toggleUsuarioActivo = async (u) => {
    try {
      await cambiarEstadoUsuario(u.idUsuario, !u.activo);
      await cargarUsuarios();
    } catch (error) {
      mostrarError(error);
    }
  };

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

  const itemMenu = (vista, texto) => (
    <div className={`menu-item ${vistaActual === vista ? 'active' : ''}`} onClick={() => setVistaActual(vista)} data-cy={`menu-${vista}`}>
      {texto}
    </div>
  );

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        {itemMenu('dashboard', '📊 Dashboard')}
        {itemMenu('vuelos', '📝 Gestión de Reservas')}
        {itemMenu('servicios', '🪂 Servicios de Vuelo')}
        {itemMenu('usuarios', '👥 Usuarios')}
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
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="card"><h4>Ejecutados</h4><p>{ejecutados}</p></div>
              <div className="card"><h4>Cancelados</h4><p>{cancelados}</p></div>
              <div className="card"><h4>Pendientes</h4><p>{pendientes}</p></div>
              <div className="card"><h4>Satisfacción</h4><p>{satisfaccionPorcentaje}%</p></div>
              <div className="card"><h4>Promedio reservas</h4><p>{porcentajeEjecutadas}%</p></div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'space-evenly', alignItems: 'center' }}>
              <div style={{ width: '300px', height: '300px' }}><Bar data={datosBarra} options={{ maintainAspectRatio: false }} /></div>
              <div style={{ width: '300px', height: '300px' }}><Doughnut data={datosSatisfaccion} options={{ maintainAspectRatio: false }} /></div>
              <div style={{ width: '300px', height: '300px' }}><Doughnut data={datosPromedio} options={{ maintainAspectRatio: false }} /></div>
            </div>
          </div>
        )}

        {vistaActual === 'vuelos' && (
          <div className="reservas-view">
            <div className="reservas-header">
              <h2>Gestión de Reservas</h2>
              <p>Consulta, filtra y actualiza las reservas registradas. El pago se confirma después de recibirlo por WhatsApp.</p>
            </div>

            <div className="reservation-summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
                        <td>{r.fecha} {r.hora}</td>
                        <td><span className={`status-pill status-pill-${CLASE_ESTADO[r.estado]}`}>{r.estado}</span></td>
                        <td className="actions">
                          {r.estado === 'Pendiente' && (
                            <button onClick={() => { setReservaPago(r); setDatosPago({ medioPago: 'Nequi', comprobante: '' }); }} data-cy="btn-confirmar-pago" style={{ background: '#2ecc71', color: 'white', marginRight: '10px' }} title="Confirmar pago">✅</button>
                          )}
                          {['Confirmada', 'Asignada'].includes(r.estado) && (
                            <button onClick={() => marcarEjecutado(r)} data-cy="btn-ejecutar" style={{ background: '#3498db', color: 'white', marginRight: '10px' }} title="Marcar como ejecutado">🛫</button>
                          )}
                          {['Pendiente', 'Confirmada', 'Asignada'].includes(r.estado) && (
                            <>
                              <button onClick={() => setReservaEditando({ id: r.id, codigo: r.codigo, idServicio: r.idServicio, fecha: r.fecha, idBloque: r.idBloque })} data-cy="btn-editar" style={{ marginRight: '10px' }} title="Reprogramar">✏️</button>
                              <button onClick={() => handleCancelar(r)} data-cy="btn-cancelar" style={{ background: '#e74c3c', color: 'white' }} title="Cancelar">🗑️</button>
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
          <div className="card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0, color: '#1a4a7c' }}>Gestión de Servicios</h2>
              <button onClick={() => setServicioEditando({ ...SERVICIO_VACIO })} className="btn-accion-principal" data-cy="btn-nuevo-servicio">
                <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>+</span> Nuevo Servicio
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#4FB3FF', color: 'white' }}>
                  <th style={{ padding: '15px', textAlign: 'center', borderRadius: '10px 0 0 0' }}>Imagen</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Título</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Precio</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderRadius: '0 10px 0 0' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eef2f6' }}>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {s.imagen
                        ? <img src={s.imagen} alt={s.titulo} style={{ width: '70px', height: '45px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'inline-block' }} />
                        : 'Sin imagen'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#1a4a7c', fontWeight: '500' }}>{s.titulo}</td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#555' }}>{formatearPrecio(s.precio)}</td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: s.activo ? '#d4edda' : '#f8d7da', color: s.activo ? '#155724' : '#721c24', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block' }}>
                        {s.activo ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="actions" style={{ padding: '15px', textAlign: 'center' }}>
                      <button onClick={() => toggleServicioActivo(s)} style={{ marginRight: '8px', background: s.activo ? '#f39c12' : '#2ecc71', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }} title={s.activo ? 'Ocultar servicio' : 'Mostrar servicio'}>
                        {s.activo ? '👁️‍🗨️' : '👁️'}
                      </button>
                      <button onClick={() => setServicioEditando({ ...s, imagen: s.imagen || '' , descripcion: s.descripcion || '' })} style={{ marginRight: '8px', background: '#4FB3FF', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => eliminarServicio(s)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {vistaActual === 'usuarios' && (
          <div className="card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1a4a7c' }}>Usuarios</h2>
                <p style={{ margin: '6px 0 0 0' }}>Solo un administrador crea administradores y pilotos. Los clientes se registran desde la página.</p>
              </div>
              <button onClick={() => setUsuarioNuevo(structuredClone(USUARIO_VACIO))} className="btn-accion-principal" data-cy="btn-nuevo-usuario">
                <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>+</span> Nuevo usuario
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
                          <button onClick={() => toggleUsuarioActivo(u)} style={{ background: u.activo ? '#e74c3c' : '#2ecc71', color: 'white' }}>
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
              <button type="button" onClick={() => setReservaPago(null)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
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
              <button type="button" onClick={() => setReservaEditando(null)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
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
              <button type="button" onClick={() => setServicioEditando(null)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
            </form>
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
              <button type="button" onClick={() => setUsuarioNuevo(null)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
