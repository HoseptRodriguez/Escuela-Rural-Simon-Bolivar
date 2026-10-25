/*
 * Tipo "arrastrar": clasificar fichas en cajas.
 * Ronda: { instruccion, audio, cajas: [figura con id], items: [figura con id y caja] }
 * Con el dedo se arrastra; también vale tocar la ficha y luego tocar la caja.
 */
(function (E) {
  'use strict';
  E.tipos.arrastrar = function (r, c) {
    const cajas = E.el('div', 'cajas'), bandeja = E.el('div', 'bandeja');
    let sel = null, faltan = r.items.length;

    r.cajas.forEach(function (cj) {
      const d = E.el('div', 'caja');
      d.setAttribute('data-id', cj.id);
      d.append(E.figura(cj, 'caja-tit'), E.el('div', 'caja-dentro'));
      d.addEventListener('click', function () { if (sel) soltar(sel, d); });
      cajas.appendChild(d);
    });

    E.mezclar(r.items.slice()).forEach(function (it) {
      const f = E.el('div', 'ficha');
      f.appendChild(E.figura(it));
      f._it = it;
      arrastrable(f);
      bandeja.appendChild(f);
    });
    c.escena.append(bandeja, cajas);

    function elegir(f) {
      if (sel) sel.classList.remove('elegida');
      sel = f;
      if (f) f.classList.add('elegida');
    }

    function soltar(f, caja) {
      elegir(null);
      if (!caja) return;
      if (caja.getAttribute('data-id') === String(f._it.caja)) {
        f.classList.add('ok');
        caja.querySelector('.caja-dentro').appendChild(f);
        c.bien(f._it);
        if (!--faltan) c.listo();
      } else {
        E.sacudir(f);
        c.mal(f._it);
      }
    }

    function arrastrable(f) {
      let id = null, x0 = 0, y0 = 0, mov = false;
      f.addEventListener('pointerdown', function (e) {
        if (f.classList.contains('ok') || id !== null) return;
        id = e.pointerId; x0 = e.clientX; y0 = e.clientY; mov = false;
        try { f.setPointerCapture(id); } catch (err) { /* sin captura el arrastre sigue funcionando */ }
      });
      f.addEventListener('pointermove', function (e) {
        if (e.pointerId !== id) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!mov && Math.abs(dx) + Math.abs(dy) > 12) { mov = true; f.classList.add('arrastrando'); }
        if (mov) f.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      f.addEventListener('pointerup', function (e) {
        if (e.pointerId !== id) return;
        id = null;
        if (!mov) { // fue un toque: seleccionar
          E.sfx.clic();
          elegir(sel === f ? null : f);
          // Las fichas de solo texto no se leen en voz alta al elegirlas: el niño debe leerlas
          if (sel && f._it.audio && f._it.img) E.voz(f._it.audio, f._it.voz || f._it.texto, f._it.idioma || c.idioma);
          return;
        }
        f.style.visibility = 'hidden';
        const bajo = document.elementFromPoint(e.clientX, e.clientY);
        f.style.visibility = '';
        f.classList.remove('arrastrando');
        f.style.transform = '';
        soltar(f, bajo && bajo.closest('.caja'));
      });
      f.addEventListener('pointercancel', function () {
        id = null; f.classList.remove('arrastrando'); f.style.transform = '';
      });
    }
  };
})(window.Escuela);
