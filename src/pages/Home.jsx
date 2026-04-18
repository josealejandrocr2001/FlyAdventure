import { Link } from "react-router-dom";

const Home = () => {
  return (
    <>
      <section className="hero-container">
        <h2>Vive la <span>libertad</span> de volar</h2>
        <p>Experimenta el parapente como nunca antes</p>
        <Link to="/reservar" className="btn-reserve">
          Reservar Ahora
        </Link>      
      </section>

      <section className="section">
        <h2>¿Por qué volar con nosotros?</h2>
        <div className="cards">
          <div className="card">
            <h3>Seguridad</h3>
            <p>Equipos certificados y pilotos expertos.</p>
          </div>

          <div className="card">
            <h3>Paisajes únicos</h3>
            <p>Vistas increíbles desde el aire.</p>
          </div>

          <div className="card">
            <h3>Experiencia inolvidable</h3>
            <p>Momentos que recordarás toda la vida.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Vuelos Destacados</h2>
        <div className="cards">
          <div className="card">
            <h3>Vuelo Básico</h3>
            <p>15 minutos de adrenalina</p>
          </div>

          <div className="card">
            <h3>Vuelo Premium</h3>
            <p>30 minutos con video incluido</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;