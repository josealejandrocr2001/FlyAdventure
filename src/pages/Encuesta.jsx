import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const Encuesta = () => {
  const { id } = useParams(); // Obtenemos el ID de la reserva desde la URL
  const [enviado, setEnviado] = useState(false);
  const [comentario, setComentario] = useState('');

  const enviarRespuesta = async (esSatisfecho) => {
    try {
      const ref = doc(db, "reservas", id);
      // Guardamos la satisfacción y el comentario en Firebase
      await updateDoc(ref, { 
        satisfaccion: esSatisfecho ? 'satisfecho' : 'no_satisfecho',
        comentarioSatisfaccion: comentario
      });
      setEnviado(true);
    } catch (error) {
      console.error("Error al enviar encuesta:", error);
      alert("Hubo un error. Intenta de nuevo.");
    }
  };

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', marginTop: '100px' }}>
        <h2 style={{ color: '#1a4a7c' }}>¡Gracias por tus comentarios! 🪂</h2>
        <p>Tu respuesta nos ayuda a seguir mejorando la experiencia Fly Adventure.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '100px auto', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderRadius: '15px', textAlign: 'center' }}>
      <h2 style={{ color: '#1a4a7c' }}>¿Cómo estuvo tu vuelo?</h2>
      <p>Nos encantaría saber tu opinión sobre tu experiencia en San Félix.</p>
      
      <textarea 
        placeholder="¿Por qué? (Opcional, cuéntanos más...)" 
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        style={{ width: '100%', height: '80px', marginTop: '20px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
        <button 
          onClick={() => enviarRespuesta(true)}
          style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '50px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          👍 Satisfecho
        </button>
        <button 
          onClick={() => enviarRespuesta(false)}
          style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '50px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          👎 No Satisfecho
        </button>
      </div>
    </div>
  );
};