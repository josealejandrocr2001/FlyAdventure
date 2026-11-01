import { Link, useLocation } from 'react-router-dom';

const WHATSAPP = '573332642395';

const Footer = () => {
  const { pathname } = useLocation();

  // El panel de administración es una herramienta de trabajo: no lleva el pie del sitio
  if (pathname.startsWith('/admin-panel')) return null;

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Link to="/" className="site-logo">Fly <span>Adventure</span></Link>
          <p>
            Vuelos biplaza en parapente desde San Félix, con pilotos certificados y equipos revisados
            antes de cada despegue.
          </p>
        </div>

        <div>
          <h4>Explora</h4>
          <ul>
            <li><Link to="/vuelos">Planes de vuelo</Link></li>
            <li><Link to="/reservar">Reservar</Link></li>
            <li><Link to="/mi-reserva">Consultar reserva</Link></li>
            <li><Link to="/nosotros">Nosotros</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contacto</h4>
          <ul>
            <li>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                <i className="bi bi-whatsapp" aria-hidden="true"></i>+57 333 264 2395
              </a>
            </li>
            <li><i className="bi bi-geo-alt" aria-hidden="true"></i>San Félix, Bello, Antioquia</li>
            <li><i className="bi bi-clock" aria-hidden="true"></i>Vuelos de 9:00 a. m. a 4:30 p. m.</li>
          </ul>
        </div>
      </div>

      <p className="footer-legal">© 2026 Fly Adventure. Todos los derechos reservados.</p>
    </footer>
  );
};

export default Footer;
