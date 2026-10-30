// src/App.jsx — rutas de la aplicación
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthProvider';
import RutaProtegida from './components/RutaProtegida';
import Header from './components/Header';
import Footer from './components/Footer';

import Home from './pages/Home';
import Booking from './pages/Booking';
import Nosotros from './pages/Nosotros';
import Flights from './pages/Flights';
import Login from './pages/Login';
import Registro from './pages/Registro';
import MiCuenta from './pages/MiCuenta';
import ConsultarReserva from './pages/ConsultarReserva';
import PanelPiloto from './pages/PanelPiloto';
import { Encuesta } from './pages/Encuesta';
import { AdminPanel } from './pages/AdminPanel';

import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />

        <main>
          <Routes>
            {/* Públicas: cualquier persona, con o sin cuenta */}
            <Route path="/" element={<Home />} />
            <Route path="/vuelos" element={<Flights />} />
            <Route path="/reservar" element={<Booking />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/mi-reserva" element={<ConsultarReserva />} />
            <Route path="/encuesta/:token" element={<Encuesta />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            {/* Compatibilidad con el enlace anterior del panel */}
            <Route path="/admin" element={<Navigate to="/login" replace />} />

            {/* Cliente con cuenta */}
            <Route
              path="/mi-cuenta"
              element={<RutaProtegida roles={['Cliente']}><MiCuenta /></RutaProtegida>}
            />

            {/* Piloto */}
            <Route
              path="/piloto"
              element={<RutaProtegida roles={['Piloto']}><PanelPiloto /></RutaProtegida>}
            />

            {/* Administrador */}
            <Route
              path="/admin-panel"
              element={<RutaProtegida roles={['Administrador']}><AdminPanel /></RutaProtegida>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
