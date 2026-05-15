import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
// IMPORTANTE: Agregamos addDoc aquí
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css';
import { cargarServiciosDeVuelo, formatearServicioParaSelect, obtenerTituloServicio, servicioEstaDisponible } from '../services/serviciosVuelos';


ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const obtenerReservas = async () => {
  const querySnapshot = await getDocs(collection(db, "reservas"));
  return querySnapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
};

const normalizarTexto = (valor = '') => valor.toString().trim().toLowerCase();

const obtenerEstadoReserva = (reserva) => {
  const estado = normalizarTexto(reserva.estado || 'pendiente');

  if (['pagado', 'confirmada', 'confirmado', 'aprobada', 'aprobado'].includes(estado)) return 'confirmada';
  if (['ejecutada', 'ejecutado'].includes(estado)) return 'ejecutada';
  if (['cancelada', 'cancelado', 'eliminada', 'eliminado'].includes(estado)) return 'cancelada';

  return 'pendiente';
};

const obtenerEtiquetaEstado = (reserva) => {
  const estado = obtenerEstadoReserva(reserva);

  if (estado === 'confirmada') return 'Confirmada';
  if (estado === 'ejecutada') return 'Ejecutada';
  if (estado === 'cancelada') return 'Cancelada';
  return 'Pendiente';
};

const obtenerFechaComoDate = (valor) => {
  if (!valor) return null;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (typeof valor === 'string') {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  return null;
};

const formatearFechaCreacion = (valor) => {
  const fecha = obtenerFechaComoDate(valor);

  if (!fecha) return 'Sin registro';

  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const obtenerValorOrdenFecha = (reserva) => {
  const fechaCreacion = obtenerFechaComoDate(reserva.fechaCreacion);
  if (fechaCreacion) return fechaCreacion.getTime();

  const fechaVuelo = obtenerFechaComoDate(reserva.fecha);
  return fechaVuelo ? fechaVuelo.getTime() : 0;
};

export const AdminPanel = () => {
  const [vistaActual, setVistaActual] = useState('dashboard');

  // Estados de Reservas
  const [reservas, setReservas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [busquedaReservas, setBusquedaReservas] = useState('');
  const [filtroFechaReserva, setFiltroFechaReserva] = useState('');
  const [filtroEstadoReserva, setFiltroEstadoReserva] = useState('');
  const [filtroTipoReserva, setFiltroTipoReserva] = useState('');
  const [ordenFechaReserva, setOrdenFechaReserva] = useState('desc');

  // Estados de Servicios
  const [servicios, setServicios] = useState([]);
  const [modalServicioAbierto, setModalServicioAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState({ id: '', titulo: '', precio: '', descripcion: '', imagen: '' });

  const hoy = new Date().toISOString().split('T')[0];

  // --- CARGA DE DATOS ---
  const cargarReservas = async () => {
    const data = await obtenerReservas();
    setReservas(data);
  };

  const cargarServicios = async () => {
    const data = await cargarServiciosDeVuelo();
    setServicios(data);
  };

  useEffect(() => {
    let montado = true;

    const cargarDatosIniciales = async () => {
      try {
        const [reservasData, serviciosData] = await Promise.all([
          obtenerReservas(),
          cargarServiciosDeVuelo()
        ]);

        if (montado) {
          setReservas(reservasData);
          setServicios(serviciosData);
        }
      } catch (error) {
        console.error("Error al cargar datos del panel:", error);
      }
    };

    cargarDatosIniciales();

    return () => {
      montado = false;
    };
  }, []);

  // --- CRUD RESERVAS ---
  const handleEditar = (reserva) => {
    setReservaEditando(reserva);
    setModalAbierto(true);
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    const ref = doc(db, "reservas", reservaEditando.id);
    await updateDoc(ref, {
      tipoVuelo: reservaEditando.tipoVuelo,
      fecha: reservaEditando.fecha
    });
    setModalAbierto(false);
    cargarReservas();
  };

  const handleEliminar = async (reserva) => {
    if (window.confirm('¿Seguro que deseas cancelar esta reserva?')) {
      const ref = doc(db, "reservas", reserva.id);
      await updateDoc(ref, { estado: "Cancelada" });
      cargarReservas();
    }
  };

  const marcarEjecutado = async (reserva) => {
    if (!window.confirm('¿Marcar vuelo como Ejecutado y enviar encuesta al cliente?')) return;

    try {
      const ref = doc(db, "reservas", reserva.id);
      await updateDoc(ref, { estado: "Ejecutado" });

      const templateParams = {
        to_name: reserva.nombre,
        to_email: reserva.email,
        link_encuesta: `https://fly-adventure.vercel.app//encuesta/${reserva.id}`
      };

      await emailjs.send(
        'service_c2u0zrv', 
        'template_9g1oxkj', // <-- ID del nuevo template en EmailJS
        templateParams,
        'aH1VCX_BLmcB3s77H'
      );

      alert("✅ Vuelo ejecutado y correo de satisfacción enviado.");
      cargarReservas();
    } catch (error) {
      console.error("Error al marcar como ejecutado:", error);
    }
  };

  const confirmarPago = async (reserva) => {
    if (!window.confirm('¿Confirmar pago y enviar correo al cliente?')) return;

    try {
      const ref = doc(db, "reservas", reserva.id);
      await updateDoc(ref, { estado: "Pagado" }); // Cambia el estado en Firebase

      // Datos que se enviarán a la plantilla del correo
      const templateParams = {
        to_name: reserva.nombre,
        to_email: reserva.email,
        fecha_vuelo: reserva.fecha,
        hora_vuelo: reserva.hora,
        tipo_vuelo: reserva.tipoVuelo
      };

      await emailjs.send(
        'service_c2u0zrv',
        'template_rukyldg',
        templateParams,
        'aH1VCX_BLmcB3s77H'
      );

      alert("✅ Reserva pagada y correo enviado con éxito.");
      cargarReservas(); // Recarga la tabla para ver el nuevo estado
    } catch (error) {
      console.error("Error al confirmar:", error);
      alert("Hubo un error al enviar el correo.");
    }
  };

  // --- CRUD SERVICIOS ---
  const guardarServicio = async (e) => {
    e.preventDefault();
    if (servicioEditando.id) {
      // Actualizar servicio existente
      await updateDoc(doc(db, "servicios", servicioEditando.id), servicioEditando);
    } else {
      // Crear nuevo servicio
      const nuevoServicio = { ...servicioEditando };
      delete nuevoServicio.id; // Eliminamos el ID vacío para que Firebase genere uno real
      await addDoc(collection(db, "servicios"), nuevoServicio);
    }
    setModalServicioAbierto(false);
    cargarServicios();
  };

  const eliminarServicio = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este servicio?')) {
      await deleteDoc(doc(db, "servicios", id));
      cargarServicios();
    }
  };

  const toggleServicioActivo = async (servicio) => {
    // Si no tiene el campo 'activo', asumimos que era true y lo pasamos a false. Si lo tiene, lo invertimos.
    const nuevoEstado = servicio.activo === undefined ? false : !servicio.activo;
    await updateDoc(doc(db, "servicios", servicio.id), { activo: nuevoEstado });
    cargarServicios();
  };

  const serviciosDisponibles = servicios.filter(servicioEstaDisponible);
  const servicioActualNoDisponible = reservaEditando?.tipoVuelo
    && !serviciosDisponibles.some((servicio) => obtenerTituloServicio(servicio) === reservaEditando.tipoVuelo);

  // --- VARIABLES PARA LAS GRÁFICAS ---
  const tiposReserva = useMemo(() => {
    const tipos = reservas
      .map((reserva) => reserva.tipoVuelo)
      .filter(Boolean);

    return [...new Set(tipos)].sort((a, b) => a.localeCompare(b));
  }, [reservas]);

  const resumenReservas = useMemo(() => ({
    total: reservas.length,
    pendientes: reservas.filter((reserva) => obtenerEstadoReserva(reserva) === 'pendiente').length,
    confirmadas: reservas.filter((reserva) => obtenerEstadoReserva(reserva) === 'confirmada').length,
    ejecutadas: reservas.filter((reserva) => obtenerEstadoReserva(reserva) === 'ejecutada').length,
    canceladas: reservas.filter((reserva) => obtenerEstadoReserva(reserva) === 'cancelada').length
  }), [reservas]);

  const reservasFiltradas = useMemo(() => {
    const busqueda = normalizarTexto(busquedaReservas);

    return reservas
      .filter((reserva) => {
        const coincideBusqueda = !busqueda
          || normalizarTexto(reserva.nombre).includes(busqueda)
          || normalizarTexto(reserva.documento).includes(busqueda);
        const coincideFecha = !filtroFechaReserva || reserva.fecha === filtroFechaReserva;
        const coincideEstado = !filtroEstadoReserva || obtenerEstadoReserva(reserva) === filtroEstadoReserva;
        const coincideTipo = !filtroTipoReserva || reserva.tipoVuelo === filtroTipoReserva;

        return coincideBusqueda && coincideFecha && coincideEstado && coincideTipo;
      })
      .sort((a, b) => {
        const diferencia = obtenerValorOrdenFecha(a) - obtenerValorOrdenFecha(b);
        return ordenFechaReserva === 'asc' ? diferencia : -diferencia;
      });
  }, [reservas, busquedaReservas, filtroFechaReserva, filtroEstadoReserva, filtroTipoReserva, ordenFechaReserva]);

  // 1. Datos básicos usando el useMemo 'resumenReservas' que ya tenías
  const ejecutados = resumenReservas.ejecutadas || 0;
  const cancelados = resumenReservas.canceladas || 0;
  const pendientes = resumenReservas.pendientes || 0;

  // 2. Cálculo de Satisfacción de Encuestas
  // Buscamos las reservas que tengan el campo 'satisfaccion' registrado
  const encuestasRespondidas = reservas.filter(r => r.satisfaccion !== undefined && r.satisfaccion !== "");
  const satisfechos = encuestasRespondidas.filter(r => r.satisfaccion === 'satisfecho' || r.satisfaccion === true).length;
  const noSatisfechos = encuestasRespondidas.length - satisfechos;
  
  const satisfaccionPorcentaje = encuestasRespondidas.length > 0 
    ? Math.round((satisfechos / encuestasRespondidas.length) * 100) 
    : 0;

  // 3. Promedio (Tasa de Efectividad)
  const totalValidas = resumenReservas.total || 0;
  const porcentajeEjecutadas = totalValidas > 0 
    ? ((ejecutados / totalValidas) * 100).toFixed(1) 
    : 0;

  // --- CONFIGURACIÓN DE GRÁFICAS ---
  const datosBarra = {
    labels: ['Ejecutados', 'Cancelados', 'Pendientes'],
    datasets: [{
      label: 'Vuelos',
      data: [ejecutados, cancelados, pendientes],
      backgroundColor: ['#4FB3FF', '#e74c3c', '#FFB703']
    }]
  };

  const datosSatisfaccion = {
    labels: ['Satisfechos', 'No Satisfechos'],
    datasets: [{
      // Si no hay encuestas, muestra un gráfico gris. Si hay, muestra los datos reales.
      data: encuestasRespondidas.length > 0 ? [satisfechos, noSatisfechos] : [1],
      backgroundColor: encuestasRespondidas.length > 0 ? ['#2ecc71', '#e74c3c'] : ['#eef2f6'],
    }]
  };

  const datosPromedio = {
    labels: ['Ejecutadas', 'Otras'],
    datasets: [{
      data: [ejecutados, totalValidas - ejecutados],
      backgroundColor: ['#FFB703', '#eef2f6']
    }]
  };

  return (
    <div className="admin-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div 
          className={`menu-item ${vistaActual === 'dashboard' ? 'active' : ''}`} 
          onClick={() => setVistaActual('dashboard')}
        >
          📊 Dashboard
        </div>
        <div 
          className={`menu-item ${vistaActual === 'vuelos' ? 'active' : ''}`} 
          onClick={() => setVistaActual('vuelos')}
        >
          📝 Gestión de Reservas
        </div>
        <div 
          className={`menu-item ${vistaActual === 'servicios' ? 'active' : ''}`} 
          onClick={() => setVistaActual('servicios')}
        >
          🪂 Servicios de Vuelo
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="content">

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
              <div style={{ width: '300px', height: '300px' }}>
                <Bar data={datosBarra} options={{ maintainAspectRatio: false }} />
              </div>
              <div style={{ width: '300px', height: '300px' }}>
                <Doughnut data={datosSatisfaccion} options={{ maintainAspectRatio: false }} />
              </div>
              <div style={{ width: '300px', height: '300px' }}>
                <Doughnut data={datosPromedio} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        )}

        {vistaActual === 'vuelos' && (
          <div className="reservas-view">
            <div className="reservas-header">
              <h2>Gestion de Reservas</h2>
              <p>Consulta, filtra y actualiza las reservas registradas.</p>
            </div>

            <div className="reservation-summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="reservation-summary-card">
                <span>Total reservas</span>
                <strong>{resumenReservas.total}</strong>
              </div>
              <div className="reservation-summary-card">
                <span>Pendientes</span>
                <strong>{resumenReservas.pendientes}</strong>
              </div>
              <div className="reservation-summary-card">
                <span>Confirmadas</span>
                <strong>{resumenReservas.confirmadas}</strong>
              </div>
              <div className="reservation-summary-card">
                <span>Ejecutadas</span>
                <strong>{resumenReservas.ejecutadas}</strong>
              </div>
              <div className="reservation-summary-card">
                <span>Canceladas</span>
                <strong>{resumenReservas.canceladas}</strong>
              </div>
            </div>

            <div className="reservation-filters">
              <div className="reservation-search">
                <input
                  type="search"
                  value={busquedaReservas}
                  onChange={(e) => setBusquedaReservas(e.target.value)}
                  placeholder="Buscar nombre o cedula"
                />
              </div>

              <input
                type="date"
                value={filtroFechaReserva}
                onChange={(e) => setFiltroFechaReserva(e.target.value)}
                title="Filtrar por fecha de vuelo"
              />

              <button
                type="button"
                className="sort-date-button"
                onClick={() => setOrdenFechaReserva(ordenFechaReserva === 'desc' ? 'asc' : 'desc')}
                title="Ordenar por fecha de creacion"
              >
                {ordenFechaReserva === 'desc' ? 'Fecha reciente' : 'Fecha antigua'}
              </button>

              <select
                value={filtroEstadoReserva}
                onChange={(e) => setFiltroEstadoReserva(e.target.value)}
                title="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="confirmada">Confirmadas</option>
                <option value="ejecutada">Ejecutadas</option>
                <option value="cancelada">Canceladas</option>
              </select>

              <select
                value={filtroTipoReserva}
                onChange={(e) => setFiltroTipoReserva(e.target.value)}
                title="Filtrar por tipo de vuelo"
              >
                <option value="">Todos los tipos</option>
                {tiposReserva.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div className="reservations-table-card">
              <div className="reservations-table-wrap">
                <table className="reservations-table">
                  <thead>
                    <tr>
                      <th>Fecha creacion</th>
                      <th>Nombre</th>
                      <th>Documento</th>
                      <th>Tipo</th>
                      <th>Fecha vuelo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.map(r => (
                      <tr key={r.id}>
                        <td>{formatearFechaCreacion(r.fechaCreacion)}</td>
                        <td className="reservation-name-cell">{r.nombre || 'Sin nombre'}</td>
                        <td>{r.documento || 'Sin documento'}</td>
                        <td>{r.tipoVuelo || 'Sin tipo'}</td>
                        <td>{r.fecha || 'Sin fecha'}</td>
                        <td>
                          <span className={`status-pill status-pill-${obtenerEstadoReserva(r)}`}>
                            {obtenerEtiquetaEstado(r)}
                          </span>
                        </td>
                        <td className="actions">
                          {/* Botón Confirmar Pago (solo en pendientes) */}
                          {obtenerEstadoReserva(r) === 'pendiente' && (
                            <button onClick={() => confirmarPago(r)} style={{ background: '#2ecc71', color: 'white', marginRight: '10px' }} title="Confirmar Pago">✅</button>
                          )}
                          {/* NUEVO: Botón Ejecutar Vuelo (solo en confirmadas) */}
                          {obtenerEstadoReserva(r) === 'confirmada' && (
                            <button onClick={() => marcarEjecutado(r)} style={{ background: '#3498db', color: 'white', marginRight: '10px' }} title="Marcar como Ejecutado">🛫</button>
                          )}

                          <button onClick={() => handleEditar(r)} style={{ marginRight: '10px' }}>✏️</button>
                          {/* Actualizado para cancelar en lugar de borrar */}
                          <button onClick={() => handleEliminar(r)} style={{ background: '#e74c3c', color: 'white' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}

                    {reservasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-reservations">
                          No hay reservas que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {vistaActual === '__legacy_vuelos' && (
          <div className="card">
            <h2>Gestión de Reservas</h2>
            <table>
              <thead>
                {/* Asegúrate de tener los encabezados correctos */}
                <tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {reservas.map(r => (
                  <tr key={r.id}> {/* 1. Envolvemos en TR con su key */}
                    <td>{r.documento}</td>
                    <td>{r.tipoVuelo}</td>
                    <td>{r.fecha}</td>
                    <td>
                      {/* Etiqueta visual para el estado */}
                      <span style={{
                        backgroundColor: r.estado === 'Pagado' ? '#d4edda' : '#fff3cd',
                        color: r.estado === 'Pagado' ? '#155724' : '#856404',
                        padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.8rem'
                      }}>
                        {r.estado || 'Pendiente'}
                      </span>
                    </td>
                    {/* 2. Etiqueta TD abierta correctamente */}
                    <td className="actions">
                      {/* NUEVO BOTÓN PARA APROBAR PAGO */}
                      {r.estado !== 'Pagado' && (
                        <button
                          onClick={() => confirmarPago(r)}
                          style={{ background: '#2ecc71', color: 'white', marginRight: '10px' }}
                          title="Confirmar Pago"
                        >
                          ✅
                        </button>
                      )}

                      <button onClick={() => handleEditar(r)} style={{ marginRight: '10px' }}>✏️</button>
                      <button onClick={() => handleEliminar(r.id)} style={{ background: '#e74c3c', color: 'white' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NUEVA VISTA: SERVICIOS */}
        {vistaActual === 'servicios' && (
          <div className="card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0, color: '#1a4a7c' }}>Gestión de Servicios</h2>

              {/* BOTÓN "COOL" REDISEÑADO */}
              <button
                onClick={() => { setServicioEditando({ id: '', titulo: '', precio: '', descripcion: '', imagen: '' }); setModalServicioAbierto(true); }}
                style={{
                  background: 'linear-gradient(135deg, #FFB703 0%, #f39c12 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '50px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 5px 15px rgba(243, 156, 18, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: 'fit-content'
                }}
              >
                <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>+</span> Nuevo Servicio
              </button>
            </div>

            {/* TABLA CON ALINEACIÓN CORREGIDA (Todo centrado) */}
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
                {servicios.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eef2f6' }}>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <img src={s.imagen} alt="vuelo" style={{ width: '70px', height: '45px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'inline-block' }} />
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#1a4a7c', fontWeight: '500' }}>{s.titulo}</td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#555' }}>${Number(s.precio).toLocaleString('es-CO')}</td>

                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: s.activo !== false ? '#d4edda' : '#f8d7da',
                        color: s.activo !== false ? '#155724' : '#721c24',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        display: 'inline-block'
                      }}>
                        {s.activo !== false ? 'Visible' : 'Oculto'}
                      </span>
                    </td>

                    <td className="actions" style={{ padding: '15px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleServicioActivo(s)}
                        style={{ marginRight: '8px', background: s.activo !== false ? '#f39c12' : '#2ecc71', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                        title={s.activo !== false ? 'Ocultar servicio' : 'Mostrar servicio'}
                      >
                        {s.activo !== false ? '👁️‍🗨️' : '👁️'}
                      </button>

                      <button
                        onClick={() => { setServicioEditando(s); setModalServicioAbierto(true); }}
                        style={{ marginRight: '8px', background: '#4FB3FF', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => eliminarServicio(s.id)}
                        style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {vistaActual === 'usuarios' && (
          <div className="card">
            <h2>Gestión de Usuarios (Próximamente)</h2>
            <p>Aquí irá el CRUD de usuarios con Firebase Auth.</p>
          </div>
        )}
      </div>

      {/* MODAL EDITAR RESERVA */}
      {modalAbierto && (
        <div className="modal">
          <div className="modal-content">
            <h3>Editar Reserva</h3>
            <form onSubmit={guardarCambios}>
              <input type="text" value={reservaEditando.documento} disabled />
              <select
                value={reservaEditando.tipoVuelo}
                onChange={e => setReservaEditando({ ...reservaEditando, tipoVuelo: e.target.value })}
                required
              >
                <option value="">Selecciona un plan</option>
                {servicioActualNoDisponible && (
                  <option value={reservaEditando.tipoVuelo}>
                    {reservaEditando.tipoVuelo} (actual, no disponible)
                  </option>
                )}
                {serviciosDisponibles.map((servicio) => (
                  <option key={servicio.id} value={obtenerTituloServicio(servicio)}>
                    {formatearServicioParaSelect(servicio)}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={reservaEditando.fecha}
                onChange={e => setReservaEditando({ ...reservaEditando, fecha: e.target.value })}
              />
              <button type="submit" style={{ width: '100%' }}>Guardar Cambios</button>
              <button type="button" onClick={() => setModalAbierto(false)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR/CREAR SERVICIO */}
      {modalServicioAbierto && (
        <div className="modal">
          <div className="modal-content" style={{ width: '400px' }}>
            <h3>{servicioEditando.id ? 'Editar' : 'Nuevo'} Servicio</h3>
            <form onSubmit={guardarServicio}>
              <input type="text" placeholder="Título (Ej: Vuelo Extremo)" value={servicioEditando.titulo} onChange={e => setServicioEditando({ ...servicioEditando, titulo: e.target.value })} required />
              <input type="number" placeholder="Precio (Ej: 250000)" value={servicioEditando.precio} onChange={e => setServicioEditando({ ...servicioEditando, precio: e.target.value })} required />
              <textarea placeholder="Descripción breve" value={servicioEditando.descripcion} onChange={e => setServicioEditando({ ...servicioEditando, descripcion: e.target.value })} required style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              <input type="url" placeholder="URL de la imagen (Ej: https://...)" value={servicioEditando.imagen} onChange={e => setServicioEditando({ ...servicioEditando, imagen: e.target.value })} required />

              <button type="submit" style={{ width: '100%' }}>Guardar</button>
              <button type="button" onClick={() => setModalServicioAbierto(false)} style={{ background: '#ccc', width: '100%' }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
