// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Encuesta } from './pages/Encuesta'; // Ajusta la ruta según tu carpeta

// Firebase (Para la autenticación)
import { auth } from "./config/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Componentes
import Header from "./components/Header";
import Footer from "./components/Footer";

// Páginas
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Nosotros from "./pages/Nosotros";
import Flights from "./pages/Flights";
import Login from "./pages/Login";
// ¡Importamos el nuevo Panel de Admin!
import { AdminPanel } from "./pages/AdminPanel";

// Estilos
import "./index.css";

// ----------------------------------------------------------------------
// Componente de Ruta Protegida: El "Vigilante"
// ----------------------------------------------------------------------
// Este componente revisa si hay alguien logueado antes de mostrar la página.
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchamos si Firebase detecta que alguien inició sesión
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Cargando...</div>;

  // Si no hay usuario, lo devolvemos al Login
  if (!user) return <Navigate to="/admin" />;

  // Si hay usuario, le mostramos el Panel
  return children;
};
// ----------------------------------------------------------------------

function App() {
  return (
    <Router>
      {/* Header reutilizable */}
      <Header />

      {/* Contenido */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/vuelos" element={<Flights />} />
          <Route path="/encuesta/:id" element={<Encuesta />} />
          
          {/* Ruta del Login (La que tú ya tenías) */}
          <Route path="/admin" element={<Login />} />

          {/* NUEVA RUTA: El Panel real, protegido por el "Vigilante" */}
          <Route 
            path="/admin-panel" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>

      {/* Footer reutilizable */}
      <Footer />
    </Router>
  );
}

export default App;



