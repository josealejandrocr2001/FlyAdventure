import React, { useState } from 'react'; // IMPORTANTE: Agregamos useState aquí

const Booking = () => {
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí puedes agregar la lógica para guardar en localStorage si quieres
    setEnviado(true);
    
    // Opcional: limpiar el formulario después de 3 segundos
    setTimeout(() => {
        setEnviado(false);
        e.target.reset();
    }, 5000);
  };

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
                <input type="text" placeholder="C.C. / Pasaporte" required />
              </div>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" placeholder="Ej: Joselin Lisboa" required />
              </div>
              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" placeholder="correo@ejemplo.com" required />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input type="tel" placeholder="WhatsApp" required />
              </div>

              <div className="input-group">
                <label>Tipo de Vuelo</label>
                <select required>
                  <option value="">Selecciona un plan</option>
                  <option value="tradicional">Vuelo Tradicional (15 min)</option>
                  <option value="extremo">Vuelo Extremo (25 min)</option>
                  <option value="pareja">Vuelo en Pareja</option>
                </select>
              </div>
              <div className="input-group">
                <label>Fecha del Vuelo</label>
                <input type="date" required />
              </div>
              <div className="input-group">
                <label>Peso (kg)</label>
                <input type="number" placeholder="Máximo 150kg" max="150" required />
              </div>
              <div className="input-group">
                <label>Edad</label>
                <input type="number" placeholder="Edad" required />
              </div>
            </div>

            <div className="input-group full-width">
              <label>Condiciones de Salud / Observaciones</label>
              <textarea placeholder="Cuéntanos si tienes alguna condición médica"></textarea>
            </div>

            <button type="submit" className="btn-reserve">Confirmar Reserva</button>
          </form>

          {enviado && (
            <div className="success-message">
              <p>¡Reserva enviada con éxito! Nos contactaremos contigo pronto.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Booking;