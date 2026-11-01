// CY-08: un pronóstico no recomendable bloquea la reserva (RF004).
// Caso de la matriz: CP-CLI-02. La respuesta de Open-Meteo se simula con cy.intercept.
import { fechaEnDias } from '../support/datos';

describe('Pronóstico del clima', () => {
  it('CY-08 no permite reservar con un pronóstico no recomendable', () => {
    cy.simularClima('desfavorable');
    cy.visit('/reservar');
    cy.llenarVuelo({ fecha: fechaEnDias(2) });

    cy.wait('@clima');
    cy.get('[data-cy=clima-nivel]').should('contain', 'No recomendable');
    cy.get('[data-cy=widget-clima]').should('contain', 'el sistema no permite reservas bajo estas condiciones');
    cy.get('[data-cy=res-enviar]').should('be.disabled');
  });
});
