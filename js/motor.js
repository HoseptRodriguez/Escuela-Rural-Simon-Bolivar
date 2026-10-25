/* Motor de actividades: marco común (barra, mascota, rondas, estrellas) para los 4 tipos. */
(function (E) {
  'use strict';
  const el = E.el;

  const ICONOS = {
    casa: '<path d="M4 15 16 4l12 11v13H19v-8h-6v8H4z"/>',
    atras: '<path d="M20 4 8 16l12 12 3-3-9-9 9-9z"/>',
    repetir: '<path d="M6 12h4l6-6v20l-6-6H6z"/><path d="M20 10a8 8 0 0 1 0 12M23 6a13 13 0 0 1 0 20" fill="none" stroke="currentColor" stroke-width="3"/>',
    estrella: '<path d="m16 2 4.2 9 9.8 1.1-7.3 6.7 2 9.7L16 23.6 7.3 28.5l2-9.7L2 12.1 11.8 11z"/>',
    otra: '<path d="M26 16a10 10 0 1 1-3-7" fill="none" stroke="currentColor" stroke-width="4"/><path d="M27 3v10H17z"/>',
    candado: '<path d="M9 14v-4a7 7 0 0 1 14 0v4h3v15H6V14zm4 0h6v-4a3 3 0 0 0-6 0z"/>'
  };
  E.icono = function (nombre, clase) {
    const s = el('span', 'icono ' + (clase || ''));
    s.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">' + ICONOS[nombre] + '</svg>';
    return s;
  };

  // Figura del JSON: { img, n, texto, traduccion }. "n" repite la imagen (para contar).
  E.figura = function (f, clase) {
    const d = el('span', 'fig ' + (clase || ''));
    if (f.img) {
      const imgs = el('span', 'fig-imgs');
      for (let i = 0; i < (f.n || 1); i++) {
        const im = el('img');
        im.src = f.img; im.alt = f.texto || f.voz || ''; im.loading = 'lazy'; im.draggable = false;
        imgs.appendChild(im);
      }
      if (f.n > 1) imgs.classList.add('varias');
      d.appendChild(imgs);
    }
    if (f.texto != null) d.appendChild(el('span', 'fig-txt', String(f.texto)));
    if (f.traduccion) d.appendChild(el('span', 'fig-trad', f.traduccion));
    return d;
  };

  // Opciones del JSON pueden ser objetos o números/textos sueltos
  E.normalizar = function (o) {
    return typeof o === 'object' ? o : { id: String(o), texto: String(o) };
  };

  E.boton = function (clase, contenido, accion) {
    const b = el('button', 'btn ' + (clase || ''));
    b.type = 'button';
    if (typeof contenido === 'string') b.textContent = contenido;
    else if (contenido) b.appendChild(contenido);
    b.addEventListener('click', function (e) { E.sfx.clic(); accion(e); });
    return b;
  };

  E.sacudir = function (n) {
    n.classList.remove('error');
    void n.offsetWidth; // reinicia la animación
    n.classList.add('error');
    setTimeout(function () { n.classList.remove('error'); }, 500);
  };

  // Mascota con globo de diálogo. Tocarla repite lo último que dijo.
  E.guia = function (leen) {
    const g = el('div', 'guia' + (leen ? '' : ' no-leen'));
    const m = el('button', 'mascota');
    m.type = 'button';
    m.setAttribute('aria-label', 'Repetir');
    m.innerHTML = '<img src="img/ui/buho.svg" alt="">';
    const globo = el('div', 'globo');
    const txt = el('span', 'globo-txt');
    globo.append(E.icono('repetir', 'globo-icono'), txt);
    g.append(m, globo);
    let ultimo = null;
    g.decir = function (texto, audio, idioma) {
      if (texto !== undefined) ultimo = [texto, audio, idioma];
      if (!ultimo) return;
      txt.textContent = ultimo[0] || '';
      m.classList.add('habla');
      E.voz(ultimo[1], ultimo[0], ultimo[2]).then(function () { m.classList.remove('habla'); });
    };
    m.addEventListener('click', function () { g.decir(); });
    globo.addEventListener('click', function () { g.decir(); });
    return g;
  };

  E.estrellasPorErrores = function (errores) {
    return errores <= 1 ? 3 : errores <= 3 ? 2 : 1;
  };

  // Ejecuta una actividad dentro de "raiz". op: { curso, alInicio, alVolver }
  E.jugar = function (raiz, act, op) {
    const leen = op.curso.leen;
    const barra = el('header', 'barra');
    const puntos = el('div', 'puntos');
    const guia = E.guia(leen);
    barra.append(
      E.boton('btn-icono casa', E.icono('casa'), op.alInicio),
      E.boton('btn-icono', E.icono('atras'), op.alVolver),
      el('h1', 'titulo', act.titulo),
      puntos,
      E.boton('btn-icono repetir', E.icono('repetir'), function () { guia.decir(); })
    );
    const escena = el('section', 'escena tipo-' + act.tipo);
    raiz.replaceChildren(barra, guia, escena);

    const rondas = act.rondas || [act];
    let i = 0, errores = 0;

    function pintarPuntos() {
      puntos.replaceChildren();
      rondas.forEach(function (_, k) { puntos.appendChild(el('span', k < i ? 'punto hecho' : k === i ? 'punto actual' : 'punto')); });
    }

    function siguiente() {
      if (i >= rondas.length) return terminar();
      const r = rondas[i];
      let cerrada = false;
      pintarPuntos();
      escena.replaceChildren();
      guia.decir(r.instruccion || act.instruccion, r.audio || act.audio, act.idioma);
      E.tipos[act.tipo](r, {
        escena: escena,
        leen: leen,
        idioma: act.idioma,
        decir: guia.decir,
        bien: function (item) {
          E.sfx.bien();
          if (item && item.audio) E.voz(item.audio, item.voz || item.texto, item.idioma || act.idioma);
        },
        mal: function (item, cuenta) {
          if (cuenta !== false) errores++;
          E.sfx.mal();
          if (cuenta === false) return;
          if (item && item.audio) E.voz(item.audio, item.voz || item.texto, item.idioma || act.idioma);
          else setTimeout(function () { E.frase('intenta'); }, 300);
        },
        listo: function () {
          if (cerrada) return;
          cerrada = true;
          i++;
          setTimeout(function () { E.frase('bien'); }, 500);
          setTimeout(siguiente, 1800);
        }
      });
    }

    function terminar() {
      const estrellas = E.estrellasPorErrores(errores);
      E.store.guardarProgreso(E.alumno().id, act.id, estrellas);
      pintarPuntos();
      const capa = el('div', 'celebracion');
      const caja = el('div', 'celebracion-caja');
      const fila = el('div', 'estrellas-grandes');
      for (let k = 0; k < 3; k++) {
        const s = E.icono('estrella', k < estrellas ? 'llena' : 'vacia');
        s.style.animationDelay = (k * 0.3) + 's';
        fila.appendChild(s);
      }
      const titulo = el('p', 'celebracion-txt', E.comun.frases.fin.texto);
      const botones = el('div', 'fila-botones');
      botones.append(
        E.boton('btn-grande verde', E.icono('otra'), function () { E.jugar(raiz, act, op); }),
        E.boton('btn-grande', E.icono('atras'), op.alVolver),
        E.boton('btn-grande', E.icono('casa'), op.alInicio)
      );
      caja.append(el('img', 'celebracion-buho'), fila, titulo, botones);
      caja.firstChild.src = 'img/ui/buho.svg';
      capa.appendChild(caja);
      raiz.appendChild(capa);
      E.sfx.fiesta();
      setTimeout(function () { E.frase('fin'); }, 900);
    }

    siguiente();
  };
})(window.Escuela);
