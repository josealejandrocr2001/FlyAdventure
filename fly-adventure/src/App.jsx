// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Booking } from './pages/Booking';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importamos Bootstrap globalmente
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <Router>
      {/* Navbar temporal para poder navegar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand text-info fw-bold" to="/">FlyAdventure</Link>
          <div className="navbar-nav">
            <Link className="nav-link" to="/">Inicio</Link>
            <Link className="nav-link text-warning" to="/reservar">Reservar con IA</Link>
          </div>
        </div>
      </nav>

      {/* Aquí se renderizan las páginas según la URL */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reservar" element={<Booking />} />
      </Routes>
    </Router>
  );
}

export default App;