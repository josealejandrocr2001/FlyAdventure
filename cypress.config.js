// Pruebas E2E con Cypress (Plan de Pruebas: CY-01 a CY-08).
// Antes de `npm run cy:run` deben estar corriendo la API (puerto 4000) y Vite (puerto 5173).
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    // Escritorio: en pantallas de menos de 900 px el encabezado esconde el botón de cerrar sesión
    viewportWidth: 1280,
    viewportHeight: 800,
    // Video de cada archivo de pruebas como evidencia (cypress/videos, no se sube a GitHub)
    video: true
  }
});
