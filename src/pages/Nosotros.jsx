const Nosotros = () => {
  return (
    <main className="nosotros-page">
      {/* SECCIÓN HERO (IGUAL AL HOME) */}
      <section className="hero-container">
        <h2>Vuela, siente, vive la libertad <span>de volar.</span></h2>
        <p>Conoce la historia detrás de tu mejor aventura</p>
      </section>

      {/* CONTENIDO DE TEXTO */}
      <div className="section">
        <h2>Sobre Nosotros</h2>
        <p>
          En <strong>Fly Adventure</strong> somos apasionados por el cielo, la naturaleza y la adrenalina. 
          Nos dedicamos a brindar experiencias inolvidables de parapente con los más altos estándares de seguridad.
        </p>
      </div>

      <div className="section">
        <h3>Nuestra misión</h3>
        <p>
          Ofrecer experiencias únicas de vuelo que conecten a las personas con la libertad, 
          la naturaleza y la emoción de volar, siempre con responsabilidad y profesionalismo.
        </p>
      </div>

      <div className="section">
        <h3>Nuestra visión</h3>
        <p>
          Ser una de las empresas líderes en experiencias de parapente en Colombia, 
          reconocida por la calidad, seguridad y satisfacción de nuestros clientes.
        </p>
      </div>

      <div className="section">
        <h3>¿Por qué elegirnos?</h3>
        <div className="cards">
          <div className="card">
            <h4>Seguridad</h4>
            <p>Equipos certificados y pilotos profesionales.</p>
          </div>
          <div className="card">
            <h4>Experiencia</h4>
            <p>Años de trayectoria en vuelos de alto nivel.</p>
          </div>
          <div className="card">
            <h4>Aventura</h4>
            <p>Vive emociones únicas en cada vuelo.</p>
          </div>
          <div className="card">
            <h4>Atención</h4>
            <p>Servicio personalizado para cada cliente.</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Nosotros;