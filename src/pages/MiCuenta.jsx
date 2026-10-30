// "Mi cuenta" del cliente: datos básicos e historial de vuelos (RF010).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TablaReservasCliente from '../components/TablaReservasCliente';
import { useAuth } from '../context/useAuth';
import { obtenerMisReservas } from '../services/reservasApi';

const MiCuenta = () => {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let montado = true;
    obtenerMisReservas()
      .then((datos) => { if (montado) setReservas(datos); })
      .catch((err) => { if (montado) setError(err.message); })
      .finally(() => { if (montado) setCargando(false); });
    return () => { montado = false; };
  }, []);

  const resumen = useMemo(() => ({
    realizados: reservas.filter((r) => r.estado === 'Ejecutada').length,
    proximos: reservas.filter((r) => ['Pendiente', 'Confirmada', 'Asignada'].includes(r.estado)).length
  }), [reservas]);

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '35vh' }}>
        <h2>Hola, <span>{usuario?.nombres}</span></h2>
        <p>Este es tu historial de vuelos con Fly Adventure</p>
      </section>

      <section className="section-form">
        <div className="form-container" style={{ maxWidth: '1100px' }}>
          <div className="cuenta-resumen">
            <div><span>Vuelos realizados</span><strong data-cy="cuenta-realizados">{resumen.realizados}</strong></div>
            <div><span>Próximos vuelos</span><strong data-cy="cuenta-proximos">{resumen.proximos}</strong></div>
            <div><span>Documento</span><strong>{usuario?.tipoDocumento} {usuario?.numeroDocumento}</strong></div>
            <div><span>Correo</span><strong style={{ fontSize: '0.95rem' }}>{usuario?.correo}</strong></div>
          </div>

          <h3 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>Historial de vuelos</h3>

          {cargando && <p>Cargando tus reservas...</p>}
          {error && <p className="form-error">{error}</p>}
          {!cargando && !error && reservas.length === 0 && (
            <p data-cy="historial-vacio">
              Aún no tienes vuelos. <Link to="/reservar">Reserva tu primera aventura</Link>.
            </p>
          )}
          {reservas.length > 0 && <TablaReservasCliente reservas={reservas} />}

          <Link to="/reservar" className="btn-reserve" style={{ textDecoration: 'none' }}>Reservar un vuelo</Link>
        </div>
      </section>
    </main>
  );
};

export default MiCuenta;
