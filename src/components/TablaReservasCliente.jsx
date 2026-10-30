// Tabla de reservas vista por el cliente (historial y consulta por código).
import { Link } from 'react-router-dom';
import { formatearPrecio } from '../services/serviciosVuelos';

const TablaReservasCliente = ({ reservas }) => (
  <div className="reservations-table-wrap">
    <table className="tabla-cliente" data-cy="tabla-historial">
      <thead>
        <tr>
          <th>Código</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Vuelo</th>
          <th>Valor</th>
          <th>Estado</th>
          <th>Encuesta</th>
        </tr>
      </thead>
      <tbody>
        {reservas.map((r) => (
          <tr key={r.codigo}>
            <td><strong>{r.codigo}</strong></td>
            <td>{r.fecha}</td>
            <td>{r.hora} - {r.horaFin}</td>
            <td>{r.servicio}</td>
            <td>{formatearPrecio(r.valorTotal)}</td>
            <td><span className={`estado-chip estado-${r.estado.toLowerCase()}`}>{r.estado}</span></td>
            <td>
              {r.encuesta && `${'★'.repeat(r.encuesta.satisfaccion)}${'☆'.repeat(5 - r.encuesta.satisfaccion)}`}
              {!r.encuesta && r.tokenEncuestaPendiente && (
                <Link to={`/encuesta/${r.tokenEncuestaPendiente}`}>Calificar vuelo</Link>
              )}
              {!r.encuesta && !r.tokenEncuestaPendiente && '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TablaReservasCliente;
