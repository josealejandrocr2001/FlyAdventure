import styled from 'styled-components';

export const NosotrosPage = styled.main`
  background: #EAF6FF;
  min-height: 100vh;
  font-family: 'Poppins', sans-serif;
`;

export const HeroContainer = styled.section`
  height: 60vh;
  background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
    url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzZiN2d6ZGxnaDlqZ3dsdDF6dmRyeWJqZ2E1ZWU4d2RjaHIzZGM2ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3V0wbCRW6nyy9buU/giphy.gif') center/cover no-repeat;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  padding: 20px;

  h2 {
    font-size: 2.5rem;
    color: #eaf6ff; /* Color azul principal */
    /* Se eliminó background, padding y border-radius para quitar la sombra negra */
    max-width: 800px;
    margin: 0;

    span {
      color: #FFB703; /* Amarillo para resaltar */
    }
  }

  p {
    margin-top: 15px;
    font-size: 1.2rem;
    color: #eaf6ff; /* Cambiado a azul para consistencia */
    text-shadow: none; /* Eliminamos cualquier sombra del texto */
    font-weight: 500;
  }
`;

export const Container = styled.div`
  max-width: 1000px;
  margin: 50px auto;
  padding: 0 20px;
`;

export const Section = styled.div`
  margin-bottom: 50px;
  text-align: center;

  h2, h3 {
    margin-bottom: 15px;
    color: #1E6091;
  }

  h2 { font-size: 2rem; }

  p {
    line-height: 1.6;
    color: #1E6091;
    max-width: 800px;
    margin: 0 auto;
  }
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 30px;
`;

export const InfoCard = styled.div`
  background: white;
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  transition: 0.3s;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-5px);
    border-color: #4FB3FF;
  }

  h4 {
    margin-bottom: 10px;
    color: #4FB3FF;
    font-size: 1.2rem;
  }

  p {
    font-size: 0.9rem;
    color: #1E6091;
  }
`;