import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const obtenerTituloServicio = (servicio) => servicio.titulo?.trim() || '';

export const servicioEstaDisponible = (servicio) => (
  servicio.activo !== false && Boolean(obtenerTituloServicio(servicio))
);

export const formatearServicioParaSelect = (servicio) => {
  const titulo = obtenerTituloServicio(servicio);
  const precio = Number(servicio.precio);

  if (!Number.isFinite(precio) || precio <= 0) {
    return titulo;
  }

  return `${titulo} - $${precio.toLocaleString('es-CO')}`;
};

export const cargarServiciosDeVuelo = async () => {
  const querySnapshot = await getDocs(collection(db, "servicios"));
  return querySnapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
};

export const cargarServiciosDisponibles = async () => {
  const servicios = await cargarServiciosDeVuelo();
  return servicios.filter(servicioEstaDisponible);
};
