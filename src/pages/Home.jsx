import { Link } from "react-router-dom";
import { HeroContainer, BtnReserve, Section, CardsContainer, Card } from "../styles/HomeStyles";

const Home = () => {
  return (
    <>
      <HeroContainer>
        <h2>Vive la <span>libertad</span> de volar</h2>
        <p>Experimenta el parapente como nunca antes</p>
        {/* Usamos as={Link} para que el botón de Styled Components se comporte como un Link de React Router */}
        <BtnReserve as={Link} to="/reservar">
          Reservar Ahora
        </BtnReserve>      
      </HeroContainer>

      <Section>
        <h2>¿Por qué volar con nosotros?</h2>
        <CardsContainer>
          <Card>
            <h3>Seguridad</h3>
            <p>Equipos certificados y pilotos expertos.</p>
          </Card>

          <Card>
            <h3>Paisajes únicos</h3>
            <p>Vistas increíbles desde el aire.</p>
          </Card>

          <Card>
            <h3>Experiencia inolvidable</h3>
            <p>Momentos que recordarás toda la vida.</p>
          </Card>
        </CardsContainer>
      </Section>

      <Section>
        <h2>Vuelos Destacados</h2>
        <CardsContainer>
          <Card>
            <h3>Vuelo Básico</h3>
            <p>15 minutos de adrenalina</p>
          </Card>

          <Card>
            <h3>Vuelo Premium</h3>
            <p>30 minutos con video incluido</p>
          </Card>
        </CardsContainer>
      </Section>
    </>
  );
};

export default Home;