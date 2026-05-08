import React from 'react';
import { Link } from "react-router-dom";
import imgVuelo1 from '../assets/vuelo-1.jpg';
import imgVuelo2 from '../assets/vuelo-2.jpg';
import imgVuelo3 from '../assets/vuelo-3.jpg';

// Importamos los nuevos estilos
import { 
  FlightsPage, 
  HeroContainer, 
  Section, 
  CardsGrid, 
  FlightCard, 
  PriceTag, 
  BtnReserve, 
  FAQContainer, 
  FAQItem 
} from "../styles/FlightStyles";

const Flights = () => {
  return (
    <FlightsPage>
      <HeroContainer>
        <h2>Nuestros <span>Vuelos</span></h2>
        <p>Elige la experiencia perfecta para ti</p>
      </HeroContainer>

      <Section>
        <h2>Categorías de Vuelo</h2>
        <p style={{ maxWidth: '700px', margin: '0 auto 40px auto' }}>
          Disfruta de nuestros planes diseñados con los más altos estándares de seguridad 
          y guiados por pilotos expertos certificados.
        </p>

        <CardsGrid>
          {/* VUELO TRADICIONAL */}
          <FlightCard>
            <img src={imgVuelo1} alt="Vuelo Tradicional" />
            <h3>Vuelo Tradicional</h3>
            <PriceTag>$120.000</PriceTag>
            <p>Ideal para principiantes. Disfruta de un planeo suave y paisajes increíbles.</p>
            <BtnReserve as={Link} to="/reservar" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </BtnReserve>
          </FlightCard>

          {/* VUELO EXTREMO */}
          <FlightCard>
            <img src={imgVuelo2} alt="Vuelo Extremo" />
            <h3>Vuelo Extremo</h3>
            <PriceTag>$250.000</PriceTag>
            <p>Para amantes de la adrenalina. Incluye maniobras acrobáticas y video profesional.</p>
            <BtnReserve as={Link} to="/reservar" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </BtnReserve>
          </FlightCard>

          {/* VUELO EN PAREJA */}
          <FlightCard>
            <img src={imgVuelo3} alt="Vuelo en Pareja" />
            <h3>Vuelo en Pareja</h3>
            <PriceTag>$450.000</PriceTag>
            <p>Comparte la magia de volar al mismo tiempo con esa persona especial.</p>
            <BtnReserve as={Link} to="/reservar" style={{ marginTop: '20px' }}>
              Reservar Ahora
            </BtnReserve>
          </FlightCard>
        </CardsGrid>

        <Section>
            <h2>Preguntas Frecuentes</h2>
            <FAQContainer>
                <FAQItem>
                    <summary>¿Qué ropa debo llevar para el vuelo?</summary>
                    <p>Te recomendamos usar ropa cómoda, pantalones largos, zapatos deportivos y chaqueta rompevientos.</p>
                </FAQItem>
                <FAQItem>
                    <summary>¿Es seguro volar en parapente?</summary>
                    <p>¡Totalmente! En <strong>Fly Adventure</strong> usamos equipos certificados y pilotos expertos.</p>
                </FAQItem>
                {/* Agrega los demás FAQItem aquí... */}
            </FAQContainer>
        </Section>
      </Section>
    </FlightsPage>
  );
};

export default Flights;