// CY-01 y CY-02: flujo pedido por el docente (registro → inicio de sesión → reserva → validación del backend).
// Casos de la matriz: CP-E2E-01, CP-REG-01, CP-LOG-13, CP-RES-02 y CP-RES-05.
import { fechaEnDias, invitado, marca } from '../support/datos';

describe('Flujo E2E del cliente', () => {
  const id = marca();
  const correo = `qa${id}@correo.com`;
  const contrasena = 'Prueba2026';
  const fecha = fechaEnDias(3);

  it('CY-01 se registra, inicia sesión, reserva y el backend lo valida', () => {
    // 1. Registro
    cy.intercept('POST', '**/api/auth/registro').as('registro');
    cy.visit('/registro');
    cy.get('[data-cy=reg-tipo-documento]').select('CC');
    cy.get('[data-cy=reg-documento]').type(String(id).slice(-10));
    cy.get('[data-cy=reg-nombres]').type('Prueba');
    cy.get('[data-cy=reg-apellidos]').type('Cypress');
    cy.get('[data-cy=reg-correo]').type(correo);
    cy.get('[data-cy=reg-telefono]').type('3001234567');
    cy.get('[data-cy=reg-contrasena]').type(contrasena, { log: false });
    cy.get('[data-cy=reg-confirmar]').type(contrasena, { log: false });
    cy.get('[data-cy=reg-autoriza]').check();
    cy.get('[data-cy=reg-enviar]').click();

    cy.wait('@registro').its('response').then((respuesta) => {
      expect(respuesta.statusCode).to.eq(201);
      expect(respuesta.body.usuario.rol).to.eq('Cliente');
    });
    cy.location('pathname').should('eq', '/mi-cuenta');
    cy.get('[data-cy=historial-vacio]').should('be.visible');

    // 2. Cerrar sesión e iniciar sesión de nuevo
    cy.get('[data-cy=btn-cerrar-sesion]').click();
    cy.get('[data-cy=nav-login]').should('be.visible');

    cy.iniciarSesion(correo, contrasena);
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/mi-cuenta');

    // 3. Reserva con la cuenta (clima simulado para que no dependa del pronóstico real)
    cy.simularClima('favorable');
    cy.intercept('POST', '**/api/reservas').as('crearReserva');
    cy.visit('/reservar');
    cy.get('[data-cy=reserva-con-cuenta]').should('contain', correo);
    cy.llenarVuelo({ fecha });
    cy.wait('@clima');
    cy.get('[data-cy=clima-nivel]').should('contain', 'Recomendable');
    cy.get('[data-cy=res-enviar]').should('be.enabled').click();

    // 4. Validación del backend: respondió 201 con el código y la reserva quedó Pendiente
    cy.wait('@crearReserva').its('response').then((respuesta) => {
      expect(respuesta.statusCode).to.eq(201);
      expect(respuesta.body.codigo).to.match(/^FA-[A-Z2-9]{8}$/);
      expect(respuesta.body.estado).to.eq('Pendiente');
      cy.wrap(respuesta.body.codigo).as('codigo');
    });
    cy.get('[data-cy=reserva-exitosa]').should('be.visible');
    cy.get('@codigo').then((codigo) => {
      cy.get('[data-cy=codigo-reserva]').should('contain', codigo);

      // 5. La reserva aparece en el historial de Mi cuenta
      cy.visit('/mi-cuenta');
      cy.get('[data-cy=tabla-historial]').should('contain', codigo).and('contain', 'Pendiente');
      cy.get('[data-cy=cuenta-proximos]').should('contain', '1');
    });
  });

  it('CY-02 el backend rechaza un peso por encima del máximo', () => {
    // Desde la página: 111 kg (el máximo del parámetro de operación es 110 kg)
    cy.simularClima('favorable');
    cy.intercept('POST', '**/api/reservas').as('crearReserva');
    cy.visit('/reservar');
    cy.llenarDatosInvitado(invitado(id + 1));
    cy.llenarVuelo({ fecha, peso: 111 });
    cy.get('[data-cy=res-enviar]').click();
    cy.wait('@crearReserva').its('response.statusCode').should('eq', 400);
    cy.get('[data-cy=res-error]').should('contain', 'El peso máximo permitido es 110 kg');
    cy.get('[data-cy=reserva-exitosa]').should('not.exist');

    // Directo a la API: 140 kg
    cy.primerServicio().then((idServicio) => {
      cy.crearReservaApi({ ...invitado(id + 2), idServicio, fecha, idBloque: 1, peso: 140 }).then((respuesta) => {
        expect(respuesta.status).to.eq(400);
        expect(respuesta.body.error).to.eq('El peso máximo permitido es 110 kg');
      });
    });
  });
});
