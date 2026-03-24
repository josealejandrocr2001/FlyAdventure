import { Link } from "react-router-dom";
const Header = () => {
  return (
    <header>
      <h1>
        Fly <span>Adventure</span>
      </h1>
      <nav>
        <Link to="/">Inicio</Link>
        <Link to="/vuelos">Vuelos</Link>
        <Link to="/reservar">Reservas</Link>
        <Link to="/nosotros">Nosotros</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </header>
  );
};

export default Header;