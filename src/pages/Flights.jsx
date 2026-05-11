import React, { useState, useEffect } from 'react'; // 1. Agregamos hooks
import { Link } from "react-router-dom";
import { cargarServiciosDisponibles, obtenerTituloServicio } from '../services/serviciosVuelos';

// Importamos los estilos (se mantienen intactos)
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
  // 3. Estado para guardar los servicios que vienen de Firebase
  const [servicios, setServicios] = useState([]);

  // 4. Efecto para cargar los datos al abrir la página
  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const data = await cargarServiciosDisponibles();
        
        // FILTRO: Solo guardamos en el estado los que NO estén ocultos
        setServicios(data);
        
      } catch (error) {
        console.error("Error al cargar los servicios:", error);
      }
    };
    
    cargarServicios();
  }, []);

  return (
    <FlightsPage>
      <HeroContainer>
        <h2>Servicios de <span>Vuelos</span></h2>
        <p>Elige la experiencia perfecta para ti</p>
      </HeroContainer>

      <Section>
        <h2>Catalogo de servicios</h2>
        <p style={{ maxWidth: '700px', margin: '0 auto 40px auto' }}>
          Disfruta de nuestros planes diseñados con los más altos estándares de seguridad
          y guiados por pilotos expertos certificados.
        </p>

        <CardsGrid>
          {/* 5. Mapeamos los servicios dinámicamente */}
          {servicios.map(servicio => (
            <FlightCard
              key={servicio.id}
              style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <img
                src={servicio.imagen}
                alt={servicio.titulo}
                style={{
                  width: '100%',
                  height: '340px', /* <-- Imagen mucho más alta */
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />

              {/* Contenedor blanco con textos más grandes */}
              <div style={{ padding: '5px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

                {/* Título más grande (1.4rem) */}
                <h3 style={{ margin: '8px 0 1px 0', fontSize: '1.4rem' }}>{servicio.titulo}</h3>

                <PriceTag style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                  ${Number(servicio.precio).toLocaleString('es-CO')}
                </PriceTag>

                {/* Descripción más grande (0.95rem) y con mejor interlineado */}
                <p style={{ margin: '0 0 25px 0', fontSize: '0.95rem', lineHeight: '1.4', flexGrow: 1 }}>
                  {servicio.descripcion}
                </p>

                <BtnReserve
                  as={Link}
                  to="/reservar"
                  state={{ tipoVuelo: obtenerTituloServicio(servicio) }}
                  style={{ marginTop: 'auto', padding: '10px 20px', fontSize: '0.9rem', width: 'fit-content', alignSelf: 'center' }}
                >
                  Reservar Ahora
                </BtnReserve>
              </div>
            </FlightCard>
          ))}
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
