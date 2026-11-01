// Comandos propios para no repetir pasos en las pruebas.
import { API } from './datos';

// Respuesta falsa de Open-Meteo con el mismo clima en las 24 horas del día pedido.
// Así la prueba no depende del clima real (que cambia cada día).
const pronostico = (fecha, { codigo, lluvia, viento, rafagas }) => {
  const horas = Array.from({ length: 24 }, (_, h) => `${fecha}T${String(h).padStart(2, '0')}:00`);
  const igual = (valor) => horas.map(() => valor);
  return {
    hourly: {
      time: horas,
      temperature_2m: igual(22),
      apparent_temperature: igual(23),
      precipitation_probability: igual(lluvia),
      weather_code: igual(codigo),
      cloud_cover: igual(20),
      visibility: igual(20000),
      wind_speed_10m: igual(viento),
      wind_gusts_10m: igual(rafagas),
      wind_direction_10m: igual(90)
    }
  };
};

const CLIMAS = {
  // Cielo casi despejado y poco viento → «Recomendable»
  favorable: { codigo: 1, lluvia: 5, viento: 8, rafagas: 14 },
  // Tormenta, lluvia y viento fuerte → «No recomendable» (bloquea la reserva)
  desfavorable: { codigo: 95, lluvia: 80, viento: 32, rafagas: 45 }
};

/** cy.simularClima('favorable' | 'desfavorable'). Úselo antes de cy.visit('/reservar'). */
Cypress.Commands.add('simularClima', (tipo) => {
  cy.intercept('GET', 'https://api.open-meteo.com/v1/forecast*', (req) => {
    const fecha = req.query.start_date || new Date().toISOString().slice(0, 10);
    req.reply({ statusCode: 200, body: pronostico(fecha, CLIMAS[tipo]) });
  }).as('clima');
});

/** Inicia sesión desde la página /login. */
Cypress.Commands.add('iniciarSesion', (correo, contrasena) => {
  cy.intercept('POST', '**/api/auth/login').as('login');
  cy.visit('/login');
  cy.get('[data-cy=login-correo]').type(correo);
  cy.get('[data-cy=login-contrasena]').type(contrasena, { log: false });
  cy.get('[data-cy=login-enviar]').click();
});

/** Diligencia los datos personales del invitado en /reservar. */
Cypress.Commands.add('llenarDatosInvitado', (datos) => {
  cy.get('[data-cy=res-tipo-documento]').select(datos.tipoDocumento);
  cy.get('[data-cy=res-documento]').type(datos.numeroDocumento);
  cy.get('[data-cy=res-nombres]').type(datos.nombres);
  cy.get('[data-cy=res-apellidos]').type(datos.apellidos);
  cy.get('[data-cy=res-correo]').type(datos.correo);
  cy.get('[data-cy=res-telefono]').type(datos.telefono);
});

/** Elige el primer vuelo, la fecha y la primera hora con cupo; escribe peso y edad y acepta los términos. */
Cypress.Commands.add('llenarVuelo', ({ fecha, peso = 70, edad = 30 }) => {
  cy.get('[data-cy=res-servicio] option').should('have.length.greaterThan', 1);
  cy.get('[data-cy=res-servicio]').select(1);
  cy.get('[data-cy=res-fecha]').type(fecha);
  // La opción 0 es «Selecciona una hora»; las horas agotadas vienen deshabilitadas
  cy.get('[data-cy=res-hora] option:not([disabled])').should('have.length.greaterThan', 1);
  cy.get('[data-cy=res-hora] option:not([disabled])').eq(1).then((opcion) => {
    cy.get('[data-cy=res-hora]').select(opcion.val());
  });
  cy.get('[data-cy=res-peso]').clear().type(String(peso));
  cy.get('[data-cy=res-edad]').clear().type(String(edad));
  cy.get('[data-cy=res-acepta]').check();
});

/** Primer servicio de vuelo visible en el catálogo público. */
Cypress.Commands.add('primerServicio', () => cy.request(`${API}/servicios`).its('body.0.id'));

/** Primer bloque con cupo en la fecha indicada (devuelve el objeto del bloque). */
Cypress.Commands.add('bloqueConCupo', (fecha) => cy.request(`${API}/reservas/disponibilidad?fecha=${fecha}`)
  .its('body')
  .then((bloques) => {
    const bloque = bloques.find((b) => b.disponibles > 0);
    expect(bloque, `un bloque con cupo el ${fecha}`).to.exist;
    return bloque;
  }));

/** Crea una reserva por la API como invitado. No falla si la API responde un error. */
Cypress.Commands.add('crearReservaApi', (cuerpo) => cy.request({
  method: 'POST',
  url: `${API}/reservas`,
  body: { peso: 70, edad: 30, aceptaTerminos: true, ...cuerpo },
  failOnStatusCode: false
}));
