import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
// IMPORTANTE: Agregamos addDoc aquí
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export const AdminPanel = () => {
  const [vistaActual, setVistaActual] = useState('dashboard');

  // Estados de Reservas
  const [reservas, setReservas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);

  // Estados de Servicios
  const [servicios, setServicios] = useState([]);
  const [modalServicioAbierto, setModalServicioAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState({ id: '', titulo: '', precio: '', descripcion: '', imagen: '' });

  const hoy = new Date().toISOString().split('T')[0];

  // --- CARGA DE DATOS ---
  const cargarReservas = async () => {
    const querySnapshot = await getDocs(collection(db, "reservas"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setReservas(data);
  };

  const cargarServicios = async () => {
    const querySnapshot = await getDocs(collection(db, "servicios"));
    setServicios(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    cargarReservas();
    cargarServicios();
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

  const handleEliminar = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta reserva?')) {
      await deleteDoc(doc(db, "reservas", id));
      cargarReservas();
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

  // --- VARIABLES PARA LAS GRÁFICAS ---
  const ejecutados = reservas.filter(item => item.fecha < hoy).length;
  const cancelados = 2;
  const pendientes = reservas.length;
  const satisfaccion = 85;
  const porcentaje = ((reservas.length / (reservas.length + 5)) * 100).toFixed(1);

  const datosBarra = {
    labels: ['Ejecutados', 'Cancelados', 'Pendientes'],
    datasets: [{
      label: 'Vuelos',
      data: [ejecutados, cancelados, pendientes],
      backgroundColor: ['#4FB3FF', '#e74c3c', '#FFC300']
    }]
  };

  const datosSatisfaccion = {
    labels: ['Satisfechos', 'No'],
    datasets: [{
      data: [satisfaccion, 100 - satisfaccion],
      backgroundColor: ['#4FB3FF', '#e74c3c']
    }]
  };

  const datosPromedio = {
    labels: ['Reservas', 'Restante'],
    datasets: [{
      data: [porcentaje, 100 - porcentaje],
      backgroundColor: ['#FFC300', '#4FB3FF']
    }]
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>Fly <span>Adventure</span></h2>
        <div className="menu-item" onClick={() => setVistaActual('dashboard')}>Dashboard</div>
        <div className="menu-item" onClick={() => setVistaActual('vuelos')}>Modificar reserva</div>
        <div className="menu-item" onClick={() => setVistaActual('servicios')}>Servicios de Vuelo</div>
        <div className="menu-item" onClick={() => setVistaActual('usuarios')}>Crear usuario admin</div>
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
              <div className="card"><h4>Satisfacción</h4><p>{satisfaccion}%</p></div>
              <div className="card"><h4>Promedio reservas</h4><p>{porcentaje}%</p></div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
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
          <div className="card">
            <h2>Gestión de Reservas</h2>
            <table>
              <thead>
                <tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {reservas.map(r => (
                  <tr key={r.id}>
                    <td>{r.documento}</td>
                    <td>{r.tipoVuelo}</td>
                    <td>{r.fecha}</td>
                    <td className="actions">
                      <button onClick={() => handleEditar(r)}>✏️</button>
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
                  background: 'linear-gradient(135deg, #FFC300 0%, #f39c12 100%)',
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
              >
                <option value="tradicional">Tradicional</option>
                <option value="extremo">Extremo</option>
                <option value="pareja">Pareja</option>
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