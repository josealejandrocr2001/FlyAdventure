// Agenda del piloto (RF014).
// PENDIENTE (Joselin): listar las reservas asignadas al piloto con sesión
// (GET /api/pilotos/agenda) y registrar el resultado del vuelo.
import { useAuth } from '../context/useAuth';

const PanelPiloto = () => {
  const { usuario } = useAuth();
  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '35vh' }}>
        <h2>Agenda de <span>{usuario?.nombres}</span></h2>
        <p>Tus vuelos asignados</p>
      </section>
      <section className="section-form">
        <div className="form-container" data-cy="panel-piloto">
          <p>La agenda del piloto está en construcción (módulo de asignación).</p>
        </div>
      </section>
    </main>
  );
};

export default PanelPiloto;
