import styled from 'styled-components';

export const HeroContainer = styled.section`
  height: 100vh;
  background: linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.6)),
    url('https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzZiN2d6ZGxnaDlqZ3dsdDF6dmRyeWJqZ2E1ZWU4d2RjaHIzZGM2ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3V0wbCRW6nyy9buU/giphy.gif')
      center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-direction: column;
  font-family: 'Poppins', sans-serif;

  h2 {
    font-size: 3.2rem;
    margin-bottom: 10px;
    color: #1e6091;

    span {
      color: #ffc300;
    }
  }

  p {
    font-size: 1.2rem;
    margin-bottom: 25px;
    color: #1e6091;
  }
`;

export const BtnReserve = styled.button`
  background: #ffc300;
  padding: 14px 30px;
  border-radius: 30px;
  text-decoration: none;
  color: #1e6091;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: 0.3s;

  &:hover {
    background: #4fb3ff;
    color: white;
  }
`;

export const Section = styled.section`
  padding: 80px 50px;
  text-align: center;
  background: #eaf6ff;

  h2 {
    color: #1e6091;
    margin-bottom: 20px;
    font-family: 'Poppins', sans-serif;
  }
`;

export const CardsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 25px;
  flex-wrap: wrap;
  margin-top: 30px;
`;

export const Card = styled.div`
  background: #ffffff;
  padding: 25px;
  border-radius: 18px;
  width: 260px;
  transition: 0.3s;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  text-align: center;

  h3 {
    color: #1e6091;
    margin-bottom: 10px;
  }

  p {
    color: #1e6091;
    font-size: 0.95rem;
  }

  &:hover {
    transform: translateY(-10px);
    border: 2px solid #ffc300;
  }
`;