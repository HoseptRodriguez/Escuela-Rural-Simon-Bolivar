/* Pantallas y navegación por hash: #/ · #/perfil/curso · #/curso/curso · #/curso/curso/materia · #/jugar/curso/materia/id */
(function (E) {
  'use strict';
  const app = document.getElementById('app'), el = E.el;
  let datos = null;

  const ir = function (h) { location.hash = h; };
  const curso = function (id) { return datos.cursos.filter(function (c) { return c.id === id; })[0]; };
  const archivo = function (c, m) { return 'data/' + c + '/' + m + '.json'; };

  function barra(titulo, atras) {
    const b = el('header', 'barra');
    b.append(E.boton('btn-icono casa', E.icono('casa'), function () { ir('#/'); }));
    if (atras) b.append(E.boton('btn-icono', E.icono('atras'), function () { ir(atras); }));
    b.append(el('h1', 'titulo', titulo));
    return b;
  }

  function pantalla(clase, titulo, atras, frase, leen) {
    const guia = E.guia(leen !== false);
    const cuerpo = el('section', 'pantalla ' + clase);
    app.replaceChildren(barra(titulo, atras), guia, cuerpo);
    const f = E.comun.frases[frase];
    guia.decir(f.texto, f.audio);
    return cuerpo;
  }

  function inicio() {
    const cuerpo = pantalla('inicio', 'Escuela Simón Bolívar', null, 'saludo');
    datos.cursos.forEach(function (c) {
      const b = E.boton('btn-curso', E.figura({ img: c.img, texto: c.nombre }), function () {
        E.store.estudiantes(c.id).then(function (lista) {
          ir(lista.length ? '#/perfil/' + c.id : '#/curso/' + c.id);
        });
      });
      b.style.setProperty('--color', c.color);
      cuerpo.appendChild(b);
    });
    const maestra = E.boton('btn-maestra', E.icono('candado'), function () {
      E.voz(null, 'El panel de maestra llega en la próxima etapa.');
    });
    maestra.setAttribute('aria-label', 'Panel de maestra');
    app.appendChild(maestra);
  }

  function perfiles(cid) {
    const c = curso(cid);
    const cuerpo = pantalla('perfiles', c.nombre, '#/', 'perfil', c.leen);
    E.store.estudiantes(cid).then(function (lista) {
      lista.concat([{ id: 'invitado', nombre: 'Invitado', avatar: 'img/ui/buho.svg' }]).forEach(function (s) {
        cuerpo.appendChild(E.boton('btn-perfil', E.figura({ img: s.avatar, texto: s.nombre }), function () {
          E.alumno({ id: s.id, nombre: s.nombre });
          ir('#/curso/' + cid);
        }));
      });
    });
  }

  function materias(cid) {
    const c = curso(cid);
    const cuerpo = pantalla('materias', c.nombre, '#/', 'materia', c.leen);
    datos.materias.forEach(function (m) {
      const b = E.boton('btn-materia', E.figura({ img: m.img, texto: m.nombre }), function () {
        ir('#/curso/' + cid + '/' + m.id);
      });
      b.style.setProperty('--color', m.color);
      b.disabled = true;
      E.json(archivo(cid, m.id)).then(function () { b.disabled = false; }, function () { b.classList.add('pronto'); });
      cuerpo.appendChild(b);
    });
  }

  function actividades(cid, mid) {
    const c = curso(cid);
    const m = datos.materias.filter(function (x) { return x.id === mid; })[0];
    const cuerpo = pantalla('actividades', c.nombre + ' · ' + m.nombre, '#/curso/' + cid, 'actividad', c.leen);
    Promise.all([E.json(archivo(cid, mid)), E.store.estrellas(E.alumno().id)]).then(function (res) {
      res[0].actividades.forEach(function (a) {
        const contenido = E.figura({ img: a.imagen, texto: a.titulo });
        const fila = el('span', 'mini-estrellas');
        for (let k = 0; k < 3; k++) fila.appendChild(E.icono('estrella', k < (res[1][a.id] || 0) ? 'llena' : 'vacia'));
        contenido.appendChild(fila);
        const b = E.boton('btn-actividad', contenido, function () { ir('#/jugar/' + cid + '/' + mid + '/' + a.id); });
        b.style.setProperty('--color', m.color);
        cuerpo.appendChild(b);
      });
    }, function () { ir('#/curso/' + cid); });
  }

  function jugar(cid, mid, aid) {
    E.json(archivo(cid, mid)).then(function (d) {
      const act = d.actividades.filter(function (a) { return a.id === aid; })[0];
      if (!act) return ir('#/curso/' + cid + '/' + mid);
      E.jugar(app, act, {
        curso: curso(cid),
        alInicio: function () { ir('#/'); },
        alVolver: function () { ir('#/curso/' + cid + '/' + mid); }
      });
    }, function () { ir('#/curso/' + cid); });
  }

  function ruta() {
    E.detenerVoz();
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[1] && !curso(p[1])) return ir('#/');
    if (p[0] === 'perfil') return perfiles(p[1]);
    if (p[0] === 'curso') return p[2] ? actividades(p[1], p[2]) : materias(p[1]);
    if (p[0] === 'jugar' && p[3]) return jugar(p[1], p[2], p[3]);
    inicio();
  }

  Promise.all([E.json('data/cursos.json'), E.json('data/comun.json')]).then(function (r) {
    datos = r[0];
    E.comun = r[1];
    window.addEventListener('hashchange', ruta);
    ruta();
  }, function () {
    app.replaceChildren(el('p', 'aviso', 'No se pudo cargar el contenido. Revisa la conexión y recarga la página.'));
  });
})(window.Escuela);
