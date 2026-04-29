import React, { useState } from 'react'; // IMPORTANTE: Agregamos useState aquí
// 1. IMPORTAMOS LA CONEXIÓN (Asegúrate que la ruta sea correcta)
import { db } from "../config/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const Booking = () => {
  const [enviado, setEnviado] = useState(false);

  // 2. CREAMOS UN ESTADO PARA RECOGER LOS DATOS DEL FORMULARIO
  const [formData, setFormData] = useState({
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    tipoVuelo: '',
    fecha: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 3. ENVIAMOS A LA COLECCIÓN "reservas" EN FIREBASE
      await addDoc(collection(db, "reservas"), {
        ...formData,
        estado: "pendiente", // Valor por defecto para el administrador
        fechaCreacion: serverTimestamp() // Fecha de sistema de Firebase
      });

      setEnviado(true);
      e.target.reset(); // Limpiar campos visualmente
      
      // Opcional: ocultar mensaje de éxito después de unos segundos
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
              {/* IMPORTANTE: Agregamos 'name' y 'onChange' a cada input */}
              <div className="input-group">
                <label>Documento de Identidad</label>
                <input type="text" name="documento" onChange={handleChange} placeholder="C.C. / Pasaporte" required />
              </div>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" name="nombre" onChange={handleChange} placeholder="Ej: Joselin Lisboa" required />
              </div>
              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" name="email" onChange={handleChange} placeholder="correo@ejemplo.com" required />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" onChange={handleChange} placeholder="WhatsApp" required />
              </div>

              <div className="input-group">
                <label>Tipo de Vuelo</label>
                <select name="tipoVuelo" onChange={handleChange} required>
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
              <div className="input-group">
                <label>Peso (kg)</label>
                <input type="number" name="peso" onChange={handleChange} placeholder="Máximo 150kg" max="150" required />
              </div>
              <div className="input-group">
                <label>Edad</label>
                <input type="number" name="edad" onChange={handleChange} placeholder="Edad" max="100" required />
              </div>
            </div>

            <div className="input-group full-width">
              <label>Condiciones de Salud / Observaciones</label>
              <textarea name="observaciones" onChange={handleChange} placeholder="Cuéntanos si tienes alguna condición médica"></textarea>
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