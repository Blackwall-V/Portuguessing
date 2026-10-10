/* Configuración del producto. Cambia solo este archivo.
 *
 * suggestUrl    dirección que recibe las sugerencias de frases (POST con JSON).
 *               Sirve Formspree (https://formspree.io/f/xxxxxxxx), Basin, Getform…
 *               Vacío = el botón "Sugerir una frase" solo aparece en localhost (modo prueba).
 * suggestFields campos fijos que el servicio pida en cada envío (p. ej. { access_key: '…' } en Web3Forms).
 * extraUrl      lista de frases aprobadas que se cargan en vivo, sin publicar una versión nueva.
 */
window.PG_CONFIG = {
  suggestUrl: '',
  suggestFields: {},
  extraUrl: 'content/extra.json',
};
