import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminPanel.css'; // Moveremos el CSS aquí

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export const AdminPanel = () => {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [reservas, setReservas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const hoy = new Date().toISOString().split('T')[0];

  // Cargar reservas desde Firebase
  const cargarReservas = async () => {
    const querySnapshot = await getDocs(collection(db, "reservas"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setReservas(data);
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  // --- CRUD Reservas ---
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
    if(window.confirm('¿Seguro que deseas eliminar esta reserva?')){
      await deleteDoc(doc(db, "reservas", id));
      cargarReservas();
    }
  };

  // --- Datos para Gráficas ---
  const datosBarra = {
    labels: ['Ejecutados', 'Cancelados', 'Pendientes'],
    datasets: [{
      label: 'Vuelos',
      data: [reservas.filter(item => item.fecha < hoy).length, 2, reservas.length],
      backgroundColor: ['#4FB3FF', '#e74c3c', '#FFC300']
    }]
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2><span></span></h2>
        <div className="menu-item" onClick={() => setVistaActual('dashboard')}>Dashboard</div>
        <div className="menu-item" onClick={() => setVistaActual('vuelos')}>Modificar reserva</div>
        <div className="menu-item" onClick={() => setVistaActual('usuarios')}>Crear usuario admin</div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="content">
        
        {vistaActual === 'dashboard' && (
          <div className="card">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="card"><h4>Ejecutados</h4><p>{reservas.filter(item => item.fecha < hoy).length}</p></div>
              <div className="card"><h4>Cancelados</h4><p>2</p></div>
              <div className="card"><h4>Pendientes</h4><p>{reservas.length}</p></div>
            </div>
            <div className="charts-container" style={{ width: '400px', marginTop: '20px' }}>
              <Bar data={datosBarra} />
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
                      <button onClick={() => handleEditar(r)} style={{marginRight: '10px'}}>✏️</button>
                      <button onClick={() => handleEliminar(r.id)} style={{background: '#e74c3c', color: 'white'}}>🗑️</button>
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
                onChange={e => setReservaEditando({...reservaEditando, tipoVuelo: e.target.value})}
              >
                <option value="tradicional">Tradicional</option>
                <option value="extremo">Extremo</option>
                <option value="pareja">Pareja</option>
              </select>
              <input 
                type="date" 
                value={reservaEditando.fecha} 
                onChange={e => setReservaEditando({...reservaEditando, fecha: e.target.value})} 
              />
              <button type="submit">Guardar Cambios</button>
              <button type="button" onClick={() => setModalAbierto(false)} style={{background: '#ccc'}}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};