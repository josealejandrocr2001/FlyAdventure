// Agenda del piloto (RF014, HU017 y HU018): vuelos asignados y registro del resultado.
// La API solo devuelve los vuelos del piloto con sesión; un piloto no ve la agenda de otro.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { enviarEncuesta } from '../services/notificaciones';
import { obtenerAgenda, registrarResultado } from '../services/pilotosApi';

const RESULTADO_VACIO = { ejecutado: true, duracionRealMin: '', vientoDespegueKmh: '', motivoNoRealizado: '', observaciones: '' };

const hoyLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const estilos = {
  tarjeta: { border: '1px solid #dde3ea', borderRadius: '12px', padding: '16px', marginBottom: '14px', textAlign: 'left', background: 'white' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  chip: { background: '#1a4a7c', color: 'white', borderRadius: '14px', padding: '4px 12px', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  datos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', margin: '12px 0', fontSize: '0.92rem' },
  alerta: { background: '#fff4e5', color: '#8a5300', borderRadius: '8px', padding: '8px 10px', fontSize: '0.9rem', margin: '8px 0' },
  fondoModal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { background: 'white', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' },
  campo: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '10px', boxSizing: 'border-box' },
  mensajeOk: { background: '#d4edda', color: '#155724', borderRadius: '8px', padding: '10px', marginBottom: '16px' }
};

const PanelPiloto = () => {
  const { usuario } = useAuth();
  const [vuelos, setVuelos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [vueloResultado, setVueloResultado] = useState(null);
  const [resultado, setResultado] = useState(RESULTADO_VACIO);
  const [errorModal, setErrorModal] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarAgenda = useCallback(() => obtenerAgenda()
    .then(setVuelos)
    .catch((err) => setError(err.message))
    .finally(() => setCargando(false)), []);

  useEffect(() => { cargarAgenda(); }, [cargarAgenda]);

  const resumen = useMemo(() => {
    const hoy = hoyLocal();
    return {
      total: vuelos.length,
      hoy: vuelos.filter((v) => v.fecha === hoy).length,
      pendientesDeRegistro: vuelos.filter((v) => v.fecha < hoy).length
    };
  }, [vuelos]);

  const abrirResultado = (vuelo) => {
    setVueloResultado(vuelo);
    setResultado({ ...RESULTADO_VACIO, duracionRealMin: vuelo.duracionMinutos || '' });
    setErrorModal('');
  };

  const guardarResultado = async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (!resultado.ejecutado && !resultado.motivoNoRealizado.trim()) {
      setErrorModal('Si el vuelo no se realizó, escribe el motivo.');
      return;
    }
    setGuardando(true);
    try {
      const { vuelo, tokenEncuesta } = await registrarResultado(vueloResultado.id, {
        ejecutado: resultado.ejecutado,
        duracionRealMin: resultado.ejecutado ? resultado.duracionRealMin : null,
        vientoDespegueKmh: resultado.vientoDespegueKmh,
        motivoNoRealizado: resultado.ejecutado ? null : resultado.motivoNoRealizado,
        observaciones: resultado.observaciones
      });

      let texto = `Vuelo ${vuelo.codigo} registrado como ${resultado.ejecutado ? 'realizado' : 'no realizado'}.`;
      if (tokenEncuesta) {
        const correo = await enviarEncuesta({ cliente: vuelo.pasajero }, tokenEncuesta).catch(() => ({ enviado: false }));
        texto += correo.enviado
          ? ' Se envió la encuesta al pasajero.'
          : ` Enlace de la encuesta para el pasajero: /encuesta/${tokenEncuesta}`;
      }
      setMensaje(texto);
      setVueloResultado(null);
      await cargarAgenda();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="reservas-page">
      <section className="hero-container" style={{ height: '35vh' }}>
        <h2>Agenda de <span>{usuario?.nombres}</span></h2>
        <p>Tus vuelos asignados</p>
      </section>

      <section className="section-form">
        <div className="form-container" style={{ maxWidth: '1000px' }} data-cy="panel-piloto">
          <div className="cuenta-resumen">
            <div><span>Vuelos asignados</span><strong data-cy="agenda-total">{resumen.total}</strong></div>
            <div><span>Vuelos de hoy</span><strong data-cy="agenda-hoy">{resumen.hoy}</strong></div>
            <div><span>Pendientes de registrar</span><strong data-cy="agenda-atrasados">{resumen.pendientesDeRegistro}</strong></div>
          </div>

          {mensaje && <p style={estilos.mensajeOk} data-cy="agenda-mensaje">{mensaje}</p>}
          {cargando && <p>Cargando tu agenda...</p>}
          {error && <p className="form-error">{error}</p>}
          {!cargando && !error && vuelos.length === 0 && (
            <p data-cy="agenda-vacia">No tienes vuelos asignados por ahora.</p>
          )}

          {vuelos.map((v) => (
            <article key={v.id} style={estilos.tarjeta} data-cy={`vuelo-${v.codigo}`}>
              <div style={estilos.cabecera}>
                <strong style={{ fontSize: '1.1rem' }}>{v.fecha} · {v.hora} a {v.horaFin}</strong>
                <span style={estilos.chip}>{v.codigo}</span>
              </div>
              <div style={estilos.datos}>
                <div><span style={{ color: '#666' }}>Vuelo</span><br /><strong>{v.servicio}</strong></div>
                <div><span style={{ color: '#666' }}>Equipo</span><br /><strong>{v.equipo}</strong></div>
                <div><span style={{ color: '#666' }}>Pasajero</span><br /><strong>{v.pasajero.nombreCompleto}</strong></div>
                <div><span style={{ color: '#666' }}>Peso / edad</span><br /><strong>{v.pasajero.peso} kg · {v.pasajero.edad} años</strong></div>
                <div><span style={{ color: '#666' }}>Teléfono</span><br /><strong>{v.pasajero.telefono}</strong></div>
                {v.pasajero.contactoEmergencia && (
                  <div><span style={{ color: '#666' }}>Emergencia</span><br /><strong>{v.pasajero.contactoEmergencia} · {v.pasajero.telefonoEmergencia}</strong></div>
                )}
              </div>
              {v.pasajero.observaciones && (
                <p style={estilos.alerta} data-cy="vuelo-observaciones">⚠️ Observaciones del pasajero: {v.pasajero.observaciones}</p>
              )}
              <button type="button" className="btn-reserve" style={{ margin: '6px 0 0', width: '100%' }} onClick={() => abrirResultado(v)} data-cy="btn-registrar-resultado">
                Registrar resultado del vuelo
              </button>
            </article>
          ))}
        </div>
      </section>

      {vueloResultado && (
        <div style={estilos.fondoModal}>
          <div style={estilos.modal} data-cy="modal-resultado">
            <h3 style={{ marginTop: 0 }}>Resultado del vuelo {vueloResultado.codigo}</h3>
            <p style={{ marginTop: 0 }}>{vueloResultado.pasajero.nombreCompleto} · {vueloResultado.fecha} {vueloResultado.hora}</p>
            <form onSubmit={guardarResultado} data-cy="form-resultado">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="ejecutado" checked={resultado.ejecutado} onChange={() => setResultado({ ...resultado, ejecutado: true })} data-cy="resultado-realizado" />
                  Se realizó
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="ejecutado" checked={!resultado.ejecutado} onChange={() => setResultado({ ...resultado, ejecutado: false })} data-cy="resultado-no-realizado" />
                  No se realizó
                </label>
              </div>

              {resultado.ejecutado ? (
                <>
                  <label style={{ fontSize: '0.85rem' }}>Duración real (minutos)</label>
                  <input type="number" min="1" max="600" value={resultado.duracionRealMin} onChange={(e) => setResultado({ ...resultado, duracionRealMin: e.target.value })} style={estilos.campo} data-cy="resultado-duracion" />
                </>
              ) : (
                <>
                  <label style={{ fontSize: '0.85rem' }}>Motivo (obligatorio)</label>
                  <input value={resultado.motivoNoRealizado} onChange={(e) => setResultado({ ...resultado, motivoNoRealizado: e.target.value })} maxLength={200} placeholder="Ej: viento fuerte en el despegue" style={estilos.campo} data-cy="resultado-motivo" required />
                </>
              )}

              <label style={{ fontSize: '0.85rem' }}>Viento en el despegue (km/h)</label>
              <input type="number" min="0" max="200" step="0.1" value={resultado.vientoDespegueKmh} onChange={(e) => setResultado({ ...resultado, vientoDespegueKmh: e.target.value })} style={estilos.campo} data-cy="resultado-viento" />

              <label style={{ fontSize: '0.85rem' }}>Observaciones</label>
              <textarea value={resultado.observaciones} onChange={(e) => setResultado({ ...resultado, observaciones: e.target.value })} maxLength={300} style={estilos.campo} data-cy="resultado-observaciones" />

              {errorModal && <p className="form-error" data-cy="resultado-error">{errorModal}</p>}

              <button type="submit" className="btn-reserve" style={{ width: '100%', margin: '4px 0 8px' }} disabled={guardando} data-cy="resultado-guardar">
                {guardando ? 'Guardando...' : 'Guardar resultado'}
              </button>
              <button type="button" onClick={() => setVueloResultado(null)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#ccc', cursor: 'pointer' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default PanelPiloto;
