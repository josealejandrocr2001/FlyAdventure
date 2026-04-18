import React from 'react';
import { Link } from "react-router-dom";
import imgVuelo1 from '../assets/vuelo-1.jpg';
import imgVuelo2 from '../assets/vuelo-2.jpg';
import imgVuelo3 from '../assets/vuelo-3.jpg';
const Flights = () => {
  return (
    <main className="flights-page">
      {/* HERO DE LA PÁGINA */}
      <section className="hero-container" style={{ height: '50vh' }}>
        <h2>Nuestros <span>Vuelos</span></h2>
        <p>Elige la experiencia perfecta para ti</p>
      </section>

      {/* SECCIÓN DE CATÁLOGO */}
      <section className="section">
        <h2>Categorías de Vuelo</h2>
        <p style={{ maxWidth: '700px', margin: '0 auto 40px auto' }}>
          Disfruta de nuestros planes diseñados con los más altos estándares de seguridad 
          y guiados por pilotos expertos certificados.
        </p>

        <div className="cards">
          
          {/* VUELO TRADICIONAL */}
          <div className="card">
            <img src={imgVuelo1} alt="Vuelo Tradicional" className="card-img" />
            <h3>Vuelo Tradicional</h3>
            <p className="flight-price">$120.000</p>
            <p>Ideal para principiantes. Disfruta de un planeo suave y paisajes increíbles.</p>
            <Link to="/reservar" className="btn-reserve" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </Link>
          </div>

          {/* VUELO EXTREMO (RESALTADO) */}
          <div className="card">
            <img src={imgVuelo2} alt="Vuelo Extremo" className="card-img" />
            <h3>Vuelo Extremo</h3>
            <p className="flight-price">$250.000</p>
            <p>Para amantes de la adrenalina. Incluye maniobras acrobáticas y video profesional.</p>
            <Link to="/reservar" className="btn-reserve" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </Link>
          </div>

          {/* VUELO EN PAREJA */}
          <div className="card">
            <img src={imgVuelo3} alt="Vuelo en Pareja" className="card-img" />
            <h3>Vuelo en Pareja</h3>
            <p className="flight-price">$450.000</p>
            <p>Comparte la magia de volar al mismo tiempo con esa persona especial.</p>
            <Link to="/reservar" className="btn-reserve" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </Link>
          </div>
        </div>
        {/* SECCIÓN DE PREGUNTAS FRECUENTES */}
        <section className="section faq-section">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-container">
                
                <details className="faq-item">
                    <summary>¿Qué ropa debo llevar para el vuelo?</summary>
                    <p>Te recomendamos usar ropa cómoda, pantalones largos (no shorts), zapatos deportivos que ajusten bien y una chaqueta rompevientos, ya que en el aire la temperatura baja un poco.</p>
                </details>

                <details className="faq-item">
                    <summary>¿Es seguro volar en parapente?</summary>
                    <p>¡Totalmente! En <strong>Fly Adventure</strong> utilizamos equipos certificados internacionalmente y todos nuestros pilotos tienen más de 10 años de experiencia y licencias vigentes.</p>
                </details>

                <details className="faq-item">
                    <summary>¿Qué pasa si el clima no es favorable?</summary>
                    <p>La seguridad es nuestra prioridad. Si las condiciones del viento o lluvia no son óptimas, reprogramaremos tu vuelo sin costo adicional para que disfrutes la mejor experiencia.</p>
                </details>

                <details className="faq-item">
                    <summary>¿Hay alguna restricción de peso o edad?</summary>
                    <p>El peso máximo permitido es de 110kg por seguridad del equipo. En cuanto a la edad, pueden volar niños desde los 6 años (con autorización de padres) hasta adultos mayores que puedan caminar unos pasos para el despegue.</p>
                </details>

            </div>
        </section>
      </section>
    </main>
  );
};

export default Flights;