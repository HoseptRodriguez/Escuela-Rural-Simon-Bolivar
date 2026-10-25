/*
 * Tipo "opcion": el niño toca la respuesta correcta.
 * Ronda: { instruccion, audio, palabra?: { texto, audio, idioma } (se dice tras la instrucción),
 *          lectura?: "oración para leer", enunciado?: [figura...],
 *          opciones: [figura con id | número], correcta: id }
 */
(function (E) {
  'use strict';
  E.tipos.opcion = function (r, c) {
    if (r.lectura) c.escena.appendChild(E.el('p', 'lectura', r.lectura));
    if (r.enunciado) {
      const en = E.el('div', 'enunciado');
      r.enunciado.forEach(function (f) { en.appendChild(E.figura(E.normalizar(f))); });
      c.escena.appendChild(en);
    }
    const grid = E.el('div', 'opciones');
    let resuelta = false;
    E.mezclar(r.opciones.map(E.normalizar)).forEach(function (o) {
      // Opciones de solo palabras (no números) usan letra legible para que quepan
      const palabra = !o.img && isNaN(o.texto) ? 'palabra' : '';
      const b = E.boton('btn-opcion', E.figura(o, palabra), function () {
        if (resuelta) return;
        if (String(o.id) === String(r.correcta)) {
          resuelta = true;
          b.classList.add('ok');
          c.bien(o);
          c.listo();
        } else {
          E.sacudir(b);
          c.mal(o);
        }
      });
      grid.appendChild(b);
    });
    c.escena.appendChild(grid);
  };
})(window.Escuela);
