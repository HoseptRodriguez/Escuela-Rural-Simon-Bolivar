/*
 * Tipo "memoria": pares de tarjetas.
 * Ronda: { instruccion, audio, pares: [{ id, a: figura, b?: figura }] }
 *   Si falta "b", la pareja es la misma figura. Si no, se une "a" con "b" (ej. número con cantidad).
 */
(function (E) {
  'use strict';
  E.tipos.memoria = function (r, c) {
    const cartas = [];
    r.pares.forEach(function (p) {
      cartas.push({ par: p.id, f: p.a });
      cartas.push({ par: p.id, f: p.b || p.a });
    });
    const grid = E.el('div', 'memoria');
    grid.style.setProperty('--cols', cartas.length > 8 ? 4 : cartas.length > 6 ? 4 : 3);
    let abiertas = [], bloqueo = false, hechos = 0;

    E.mezclar(cartas).forEach(function (k) {
      const b = E.boton('carta', null, function () {
        if (bloqueo || b.classList.contains('abierta')) return;
        b.classList.add('abierta');
        if (k.f.audio) E.voz(k.f.audio, k.f.voz || k.f.texto, k.f.idioma || c.idioma);
        abiertas.push({ b: b, k: k });
        if (abiertas.length < 2) return;
        const x = abiertas[0], y = abiertas[1];
        abiertas = [];
        if (x.k.par === y.k.par) {
          x.b.classList.add('ok'); y.b.classList.add('ok');
          c.bien();
          if (++hechos === r.pares.length) c.listo();
        } else {
          bloqueo = true;
          setTimeout(function () {
            c.mal(null, false); // equivocarse es parte del juego: no resta estrellas
            x.b.classList.remove('abierta'); y.b.classList.remove('abierta');
            bloqueo = false;
          }, 1000);
        }
      });
      // Las palabras usan letra legible y más pequeña; los números, letra pixel grande
      const largo = k.f.texto != null && isNaN(k.f.texto) ? ' largo' : '';
      b.append(E.el('span', 'dorso', '?'), E.figura(k.f, 'cara' + largo));
      grid.appendChild(b);
    });
    c.escena.appendChild(grid);
  };
})(window.Escuela);
