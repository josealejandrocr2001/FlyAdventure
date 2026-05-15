const LATITUD_VUELO = 6.330681;
const LONGITUD_VUELO = -75.599079;
const TIMEZONE = 'America/Bogota';

const DESCRIPCIONES_CLIMA = {
  0: 'Cielo despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia fuerte',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos fuertes',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta fuerte con granizo'
};

const CODIGOS_LLUVIA_FUERTE = new Set([65, 82, 95, 96, 99]);
const CODIGOS_LLUVIA_MODERADA = new Set([53, 55, 61, 63, 80, 81]);

const obtenerMinutos = (horaIso) => {
  const [, hora = '00:00'] = horaIso.split('T');
  const [horas, minutos] = hora.split(':').map(Number);
  return (horas * 60) + minutos;
};

const buscarIndiceMasCercano = (horas, horaSeleccionada) => {
  const objetivo = obtenerMinutos(`T${horaSeleccionada}`);

  return horas.reduce((mejorIndice, horaActual, indice) => {
    const diferenciaActual = Math.abs(obtenerMinutos(horaActual) - objetivo);
    const diferenciaMejor = Math.abs(obtenerMinutos(horas[mejorIndice]) - objetivo);
    return diferenciaActual < diferenciaMejor ? indice : mejorIndice;
  }, 0);
};

const evaluarRecomendacion = ({
  codigoClima,
  probabilidadLluvia,
  velocidadViento,
  rafagasViento,
  visibilidad
}) => {
  const visibilidadKm = visibilidad == null ? null : visibilidad / 1000;

  if (
    CODIGOS_LLUVIA_FUERTE.has(codigoClima)
    || probabilidadLluvia >= 65
    || velocidadViento >= 28
    || rafagasViento >= 38
    || (visibilidadKm !== null && visibilidadKm < 5)
  ) {
    return {
      nivel: 'malo',
      titulo: 'No recomendable',
      texto: 'Por tu seguridad, el sistema no permite reservas bajo estas condiciones climáticas. Por favor, selecciona una fecha u hora diferente.'
    };
  }

  if (
    CODIGOS_LLUVIA_MODERADA.has(codigoClima)
    || probabilidadLluvia >= 35
    || velocidadViento >= 20
    || rafagasViento >= 30
    || (visibilidadKm !== null && visibilidadKm < 8)
  ) {
    return {
      nivel: 'medio',
      titulo: 'Con precaucion',
      texto: 'El pronostico muestra condiciones variables. Puede ser viable, pero requiere validacion del equipo de vuelo.'
    };
  }

  return {
    nivel: 'bueno',
    titulo: 'Recomendable',
    texto: 'El pronostico luce favorable para la fecha y hora seleccionadas. La confirmacion final depende del piloto y las condiciones en sitio.'
  };
};

export const consultarPronosticoVuelo = async ({ fecha, hora, signal }) => {
  const parametros = new URLSearchParams({
    latitude: LATITUD_VUELO.toString(),
    longitude: LONGITUD_VUELO.toString(),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'weather_code',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m'
    ].join(','),
    wind_speed_unit: 'kmh',
    timezone: TIMEZONE,
    start_date: fecha,
    end_date: fecha
  });

  const respuesta = await fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`, { signal });

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el pronostico.');
  }

  const datos = await respuesta.json();
  const horas = datos.hourly?.time || [];

  if (horas.length === 0) {
    throw new Error('No hay pronostico disponible para esa fecha.');
  }

  const indice = buscarIndiceMasCercano(horas, hora);
  const pronostico = {
    horaPronostico: horas[indice],
    temperatura: datos.hourly.temperature_2m?.[indice],
    sensacion: datos.hourly.apparent_temperature?.[indice],
    probabilidadLluvia: datos.hourly.precipitation_probability?.[indice] ?? 0,
    codigoClima: datos.hourly.weather_code?.[indice],
    descripcion: DESCRIPCIONES_CLIMA[datos.hourly.weather_code?.[indice]] || 'Condiciones variables',
    nubosidad: datos.hourly.cloud_cover?.[indice],
    visibilidad: datos.hourly.visibility?.[indice],
    velocidadViento: datos.hourly.wind_speed_10m?.[indice] ?? 0,
    rafagasViento: datos.hourly.wind_gusts_10m?.[indice] ?? 0,
    direccionViento: datos.hourly.wind_direction_10m?.[indice]
  };

  return {
    ...pronostico,
    recomendacion: evaluarRecomendacion(pronostico)
  };
};
