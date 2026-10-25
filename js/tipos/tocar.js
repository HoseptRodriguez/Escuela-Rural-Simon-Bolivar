/*
 * Tipo "tocar": escuchar y tocar, o contar.
 * Ronda para tocar:  { instruccion, audio, items: [figura con id], correctos: [id...] }
 * Ronda para contar: { instruccion, audio, contar: { img, cantidad, opciones: [números] } }
 *   El niño toca cada objeto (la mascota cuenta en voz alta) y luego elige cuántos hay.
 */
(function (E) {
  'use strict';
  E.tipos.tocar = function (r, c) {
    const zona = E.el('div', 'tocar');
    c.escena.appendChild(zona);
    if (r.contar) return contar(r.contar, c, zona);

    const faltan = r.correctos.map(String);
    E.mezclar(r.items.slice()).forEach(function (it) {
      const b = E.boton('btn-opcion', E.figura(it), function () {
        if (b.classList.contains('ok')) return;
        const k = faltan.indexOf(String(it.id));
        if (k >= 0) {
          faltan.splice(k, 1);
          b.classList.add('ok');
          c.bien(it);
          if (!faltan.length) c.listo();
        } else {
          E.sacudir(b);
          c.mal(it);
        }
      });
      zona.appendChild(b);
    });
  };

  function contar(k, c, zona) {
    let n = 0;
    for (let j = 0; j < k.cantidad; j++) {
      const b = E.boton('btn-objeto', E.figura({ img: k.img }), function () {
        if (b.classList.contains('ok')) return;
        n++;
        b.classList.add('ok');
        b.setAttribute('data-n', n);
        E.numero(n);
        if (n === k.cantidad) setTimeout(preguntar, 900);
      });
      zona.appendChild(b);
    }
    function preguntar() {
      const f = E.comun.frases.cuantos;
      c.decir(f.texto, f.audio);
      E.tipos.opcion({ opciones: k.opciones, correcta: k.cantidad }, c);
    }
  }
})(window.Escuela);
