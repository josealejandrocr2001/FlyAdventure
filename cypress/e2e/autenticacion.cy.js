// CY-03, CY-04 y CY-05: inicio de sesión, registro duplicado y acceso por rol.
// Casos de la matriz: CP-LOG-04, CP-REG-04, CP-LOG-08 y CP-LOG-10.
// Requiere la base creada con database/FlyAdventure_MySQL_v2.sql (usa la cuenta de Ana).
import { API, CLAVE_USUARIOS_PRUEBA, CLIENTE_SCRIPT, marca } from '../support/datos';

describe('Autenticación y acceso por rol', () => {
  it('CY-03 muestra un error con la contraseña incorrecta', () => {
    cy.iniciarSesion(CLIENTE_SCRIPT.correo, 'Incorrecta123');
    cy.wait('@login').its('response.statusCode').should('eq', 401);
    cy.get('[data-cy=login-error]').should('contain', 'Correo o contraseña incorrectos');
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-cy=btn-cerrar-sesion]').should('not.exist');
  });

  it('CY-04 no permite registrarse con un correo que ya tiene cuenta', () => {
    cy.intercept('POST', '**/api/auth/registro').as('registro');
    cy.visit('/registro');
    cy.get('[data-cy=reg-documento]').type(String(marca()).slice(-10));
    cy.get('[data-cy=reg-nombres]').type('Correo');
    cy.get('[data-cy=reg-apellidos]').type('Repetido');
    cy.get('[data-cy=reg-correo]').type(CLIENTE_SCRIPT.correo);
    cy.get('[data-cy=reg-telefono]').type('3001234567');
    cy.get('[data-cy=reg-contrasena]').type('Prueba2026', { log: false });
    cy.get('[data-cy=reg-confirmar]').type('Prueba2026', { log: false });
    cy.get('[data-cy=reg-autoriza]').check();
    cy.get('[data-cy=reg-enviar]').click();

    cy.wait('@registro').its('response.statusCode').should('eq', 409);
    cy.get('[data-cy=reg-error]').should('contain', 'Ya existe una cuenta con ese correo');
    cy.location('pathname').should('eq', '/registro');
  });

  it('CY-05 un cliente no puede entrar al panel de administración', () => {
    cy.iniciarSesion(CLIENTE_SCRIPT.correo, CLAVE_USUARIOS_PRUEBA);
    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/mi-cuenta');

    // La página lo redirige a su espacio
    cy.visit('/admin-panel');
    cy.location('pathname').should('eq', '/mi-cuenta');
    cy.get('[data-cy=tabla-reservas]').should('not.exist');

    // Y la API, que es la seguridad real, responde 403 con su token
    cy.window().then((ventana) => {
      const { token } = JSON.parse(ventana.localStorage.getItem('flyadventure.sesion'));
      cy.request({
        url: `${API}/reservas`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then((respuesta) => {
        expect(respuesta.status).to.eq(403);
        expect(respuesta.body.error).to.eq('No tiene permisos para esta acción');
      });
    });
  });
});
