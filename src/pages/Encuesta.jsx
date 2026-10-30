// Encuesta de satisfacción (RF020). Llega por correo con un token único.
// PENDIENTE (Linay): escala de 1 a 5 estrellas y análisis de sentimiento con IA en el backend.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { obtenerEncuesta, responderEncuesta } from '../services/encuestasApi';

const contenedor = { maxWidth: '500px', margin: '100px auto', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderRadius: '15px', textAlign: 'center' };
const boton = { color: 'white', border: 'none', padding: '15px 30px', borderRadius: '50px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' };

export const Encuesta = () => {
  const { token } = useParams();
  const [encuesta, setEncuesta] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerEncuesta(token)
      .then((datos) => {
        setEncuesta(datos);
        setEnviado(datos.respondida);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  // Mientras se implementa la escala de estrellas: 👍 = 5 y 👎 = 1
  const enviarRespuesta = async (esSatisfecho) => {
    setError('');
    try {
      await responderEncuesta(token, esSatisfecho ? 5 : 1, comentario);
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !encuesta) {
    return <div style={contenedor}><h2 style={{ color: '#1a4a7c' }}>Enlace no válido</h2><p>{error}</p></div>;
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', marginTop: '100px' }} data-cy="encuesta-gracias">
        <h2 style={{ color: '#1a4a7c' }}>¡Gracias por tus comentarios! 🪂</h2>
        <p>Tu respuesta nos ayuda a seguir mejorando la experiencia Fly Adventure.</p>
      </div>
    );
  }

  if (!encuesta) return <div style={contenedor}>Cargando...</div>;

  return (
    <div style={contenedor}>
      <h2 style={{ color: '#1a4a7c' }}>¿Cómo estuvo tu vuelo, {encuesta.nombre}?</h2>
      <p>{encuesta.servicio} del {encuesta.fechaVuelo} en San Félix.</p>

      <textarea
        placeholder="¿Por qué? (Opcional, cuéntanos más...)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={500}
        data-cy="encuesta-comentario"
        style={{ width: '100%', height: '80px', marginTop: '20px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />

      {error && <p className="form-error">{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        <button onClick={() => enviarRespuesta(true)} data-cy="encuesta-satisfecho" style={{ ...boton, background: '#2ecc71' }}>👍 Satisfecho</button>
        <button onClick={() => enviarRespuesta(false)} data-cy="encuesta-no-satisfecho" style={{ ...boton, background: '#e74c3c' }}>👎 No Satisfecho</button>
      </div>
    </div>
  );
};
