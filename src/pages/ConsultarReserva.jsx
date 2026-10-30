// Consulta de una reserva sin cuenta: código + documento (RF010).
import { useState } from 'react';
import TablaReservasCliente from '../components/TablaReservasCliente';
import { consultarReservaPorCodigo } from '../services/reservasApi';

const ConsultarReserva = () => {
  const [codigo, setCodigo] = useState('');
  const [documento, setDocumento] = useState('');
  const [reserva, setReserva] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setReserva(null);
    try {
      setReserva(await consultarReservaPorCodigo(codigo.trim(), documento.trim()));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '35vh' }}>
        <h2>Consulta tu <span>reserva</span></h2>
        <p>Usa el código que recibiste al reservar</p>
      </section>
      <section className="section-form">
        <div className="form-container">
          <form onSubmit={handleSubmit} data-cy="form-consulta">
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="cons-codigo">Código de reserva</label>
                <input id="cons-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="FA-XXXXXXXX" data-cy="consulta-codigo" required />
              </div>
              <div className="input-group">
                <label htmlFor="cons-documento">Número de documento</label>
                <input id="cons-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} data-cy="consulta-documento" required />
              </div>
            </div>
            {error && <p className="form-error" data-cy="consulta-error">{error}</p>}
            <button type="submit" className="btn-reserve" data-cy="consulta-enviar">Consultar</button>
          </form>
          {reserva && <div style={{ marginTop: '30px' }}><TablaReservasCliente reservas={[reserva]} /></div>}
        </div>
      </section>
    </main>
  );
};

export default ConsultarReserva;
