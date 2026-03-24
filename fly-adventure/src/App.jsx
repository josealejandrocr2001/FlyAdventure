// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Componentes
import Header from "./components/Header";
import Footer from "./components/Footer";

// Páginas
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Nosotros from "./pages/Nosotros";
import Flights from './pages/Flights';
import Login from './pages/Login';

// Estilos
import "./index.css";

function App() {
  return (
    <Router>

      {/*Header reutilizable */}
      <Header />

      {/*Contenido */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/vuelos" element={<Flights />} />
          <Route path="/admin" element={<Login />} />
        </Routes>
      </main>

      {/*Footer reutilizable */}
      <Footer />

    </Router>
  );
}

export default App;