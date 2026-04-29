import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); 
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

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
        
        {user ? (
          <>
            <Link to="/admin-panel" className="nav-admin-link">Panel Admin</Link>
            <button onClick={handleLogout}>Cerrar sesión</button>
          </>
        ) : (
          <Link to="/admin">Admin</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;