import React from 'react';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div>
      {/* Sección Hero (Banner principal) */}
      <section 
        className="d-flex align-items-center position-relative" 
        style={{ 
          minHeight: '85vh',
          background: `linear-gradient(rgba(241, 241, 241, 0.7), rgba(9, 9, 9, 0.9)), url('https://images.unsplash.com/photo-1521510895915-16986c547626?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80') center/cover no-repeat`
        }}
      >
        <div className="container text-center text-white position-relative z-index-1">
          <h1 className="display-3 fw-bold mb-4 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Domina el Cielo con <span className="text-accent">Fly Adventure</span>
          </h1>
          <p className="lead mb-5 mx-auto" style={{ maxWidth: '700px', fontSize: '1.2rem' }}>
            La plataforma inteligente de reservas de parapente. Consulta el clima en tiempo real, recibe recomendaciones de nuestra IA y asegura tu vuelo en segundos.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/reservar" className="btn btn-accent btn-lg px-5 rounded-pill shadow">
              Reservar con IA <i className="bi bi-robot ms-2"></i>
            </Link>
            <a href="#servicios" className="btn btn-outline-light btn-lg px-5 rounded-pill">
              Ver Vuelos
            </a>
          </div>
        </div>
      </section>

      {/* Sección de Servicios (Catálogo rápido) */}
      <section id="servicios" className="py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2>Nuestras Experiencias</h2>
            <p className="text-muted">Vuelos operados por los mejores profesionales.</p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Tarjeta de Vuelo 1 */}
            <div className="col-md-5">
              <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style={{ transition: 'transform 0.3s' }}>
                <img src="https://images.unsplash.com/photo-1533230677134-927181c0eb3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" className="card-img-top" alt="Vuelo Recreativo" style={{ height: '250px', objectFit: 'cover' }} />
                <div className="card-body p-4 text-center">
                  <h3 className="h4 mb-3">Vuelo Recreativo</h3>
                  <p className="text-muted mb-4">15 minutos surcando los cielos con un piloto experto certificado. Ideal para tu primera vez en las nubes.</p>
                  <Link to="/reservar" className="btn btn-accent w-100 rounded-pill py-2">Agendar Vuelo</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};