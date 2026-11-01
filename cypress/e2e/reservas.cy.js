// CY-06 y CY-07: cupos por bloque y consulta de una reserva sin cuenta.
// Casos de la matriz: CP-RES-04, CP-CON-01 y CP-CON-02.
import { fechaEnDias, invitado, marca } from '../support/datos';

describe('Reservas', () => {
  it('CY-06 el backend rechaza una reserva cuando el bloque está lleno', () => {
    const id = marca();
    // Una fecha lejana distinta en cada corrida para no chocar con reservas de corridas anteriores
    const fecha = fechaEnDias(30 + (id % 300));

    cy.primerServicio().then((idServicio) => {
      cy.bloqueConCupo(fecha).then((bloque) => {
        const reserva = (n) => ({ ...invitado(id + n), idServicio, fecha, idBloque: bloque.idBloque });

        // Llena los cupos que quedan en el bloque
        Cypress._.times(bloque.disponibles, (n) => {
          cy.crearReservaApi(reserva(n)).its('status').should('eq', 201);
        });

        // Una reserva más en el mismo bloque: 409
        cy.crearReservaApi(reserva(99)).then((respuesta) => {
          expect(respuesta.status).to.eq(409);
          expect(respuesta.body.error).to.eq('El bloque horario seleccionado ya no tiene cupos. Elija otra hora.');
        });

        // En la página, esa hora aparece agotada y no se puede elegir
        cy.visit('/reservar');
        cy.get('[data-cy=res-fecha]').type(fecha);
        cy.get(`[data-cy=res-hora] option[value="${bloque.idBloque}"]`)
          .should('be.disabled')
          .and('contain', 'Agotado');
      });
    });
  });

  it('CY-07 no muestra una reserva consultada con el documento de otra persona', () => {
    const id = marca();
    const datos = invitado(id);
    const fecha = fechaEnDias(5);

    cy.primerServicio().then((idServicio) => {
      cy.bloqueConCupo(fecha).then((bloque) => {
        cy.crearReservaApi({ ...datos, idServicio, fecha, idBloque: bloque.idBloque }).then((respuesta) => {
          expect(respuesta.status).to.eq(201);
          const { codigo } = respuesta.body;

          cy.intercept('GET', '**/api/reservas/consulta*').as('consulta');
          cy.visit('/mi-reserva');

          // Código correcto con un documento ajeno: 404 y no muestra datos
          cy.get('[data-cy=consulta-codigo]').type(codigo);
          cy.get('[data-cy=consulta-documento]').type(`9${String(id).slice(-8)}`);
          cy.get('[data-cy=consulta-enviar]').click();
          cy.wait('@consulta').its('response.statusCode').should('eq', 404);
          cy.get('[data-cy=consulta-error]').should('contain', 'No encontramos una reserva con ese código y documento');
          cy.get('[data-cy=tabla-historial]').should('not.exist');

          // Con el documento de quien reservó sí aparece
          cy.get('[data-cy=consulta-documento]').clear().type(datos.numeroDocumento);
          cy.get('[data-cy=consulta-enviar]').click();
          cy.wait('@consulta').its('response.statusCode').should('eq', 200);
          cy.get('[data-cy=tabla-historial]').should('contain', codigo).and('contain', 'Pendiente');
        });
      });
    });
  });
});
