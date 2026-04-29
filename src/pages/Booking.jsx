import React, { useState, useEffect } from 'react'; // IMPORTANTE: Agregamos useEffect
import { db } from "../config/firebase"; 
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"; // Importamos las herramientas de consulta

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

const Booking = () => {
  const [enviado, setEnviado] = useState(false);
  const [cuposOcupados, setCuposOcupados] = useState({}); // Estado para llevar la cuenta de los cupos

  // 2. ESTADO PARA RECOGER LOS DATOS DEL FORMULARIO (Agregamos 'hora')
  const [formData, setFormData] = useState({
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    tipoVuelo: '',
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, "reservas"), {
        ...formData,
        estado: "pendiente", 
        fechaCreacion: serverTimestamp() 
      });

      setEnviado(true);
      
      // Limpiamos el formulario manualmente para resetear también los selects
      setFormData({
        documento: '', nombre: '', email: '', telefono: '', tipoVuelo: '', fecha: '', hora: '', peso: '', edad: '', observaciones: ''
      });
      e.target.reset(); 
      
      setTimeout(() => setEnviado(false), 5000);

    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      alert("Error al conectar con la base de datos");
    }
  };

  const hoy = new Date().toISOString().split('T')[0];

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
                <select name="tipoVuelo" value={formData.tipoVuelo} onChange={handleChange} required>
                  <option value="">Selecciona un plan</option>
                  <option value="tradicional">Vuelo Tradicional (15 min)</option>
                  <option value="extremo">Vuelo Extremo (25 min)</option>
                  <option value="pareja">Vuelo en Pareja</option>
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

            <button type="submit" className="btn-reserve">Confirmar Reserva</button>
          </form>

          {enviado && (
            <div className="success-message">
              <p>¡Reserva guardada en Firebase con éxito! El administrador la revisará pronto.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Booking;