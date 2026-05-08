import styled from 'styled-components';

export const FlightsPage = styled.main`
  background: #EAF6FF;
  min-height: 100vh;
  font-family: 'Poppins', sans-serif;
`;

export const HeroContainer = styled.section`
  padding: 80px 20px 40px;
  text-align: center;
  background: white; /* Diferenciamos el hero del fondo */
  
  h2 {
    font-size: 2.5rem;
    color: #1E6091;
    span {
      color: #FFC300;
    }
  }

  p {
    margin-top: 10px;
    color: #1E6091;
  }
`;

export const Section = styled.section`
  padding: 40px 60px;
  text-align: center;

  h2 {
    color: #1E6091;
    margin-bottom: 20px;
  }
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  margin-top: 30px;
`;

export const FlightCard = styled.div`
  background: #FFFFFF;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  transition: 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 25px;

  &:hover {
    transform: translateY(-8px);
    border: 1px solid #4FB3FF;
  }

  img {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  h3 {
    margin: 20px 0 10px;
    color: #1E6091;
  }

  p {
    padding: 0 20px;
    color: #555;
    font-size: 0.95rem;
  }
`;

export const PriceTag = styled.p`
  color: #FFC300 !react-important; /* Usamos el amarillo de tu paleta */
  font-size: 1.5rem !important;
  font-weight: 700;
  margin: 15px 0 !important;
`;

export const BtnReserve = styled.button`
  background: #4FB3FF;
  color: white;
  padding: 10px 25px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: 0.3s;

  &:hover {
    background: #FFC300;
    color: #1E6091;
  }
`;

/* Estilos para las Preguntas Frecuentes */
export const FAQContainer = styled.div`
  max-width: 800px;
  margin: 40px auto;
  text-align: left;
`;

export const FAQItem = styled.details`
  background: white;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  cursor: pointer;

  summary {
    font-weight: 600;
    color: #1E6091;
    outline: none;
  }

  p {
    margin-top: 10px;
    color: #444;
    line-height: 1.6;
    border-top: 1px solid #eee;
    padding-top: 10px;
  }
`;