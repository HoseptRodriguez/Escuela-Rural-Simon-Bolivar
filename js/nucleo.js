/* Núcleo: utilidades, audio y almacenamiento. Sin dependencias; compatible con Chrome 109. */
(function () {
  'use strict';
  const E = window.Escuela = { tipos: {}, comun: {} };

  // Crea un elemento: E.el('button', 'clase', 'texto')
  E.el = function (tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  };

  E.mezclar = function (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  const cache = {};
  E.json = function (url) {
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(url + ' ' + r.status);
        return r.json();
      });
      cache[url].catch(function () { delete cache[url]; });
    }
    return cache[url];
  };

  /* ---------- Voz: mp3 pregrabado; la síntesis del navegador solo como respaldo ---------- */
  const VERSION_AUDIO = 2; // súbela si se regeneran las voces y algún navegador guardó las viejas
  let sonando = null;
  E.detenerVoz = function () {
    if (sonando) { sonando.pause(); sonando = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  };

  E.voz = function (src, texto, idioma) {
    E.detenerVoz();
    return new Promise(function (fin) {
      let hecho = false, a = null;
      const respaldo = function () {
        if (hecho || (a && sonando !== a)) return;
        hecho = true;
        hablar(texto, idioma, fin);
      };
      if (!src) return respaldo();
      // ?v= obliga a descargar de nuevo los audios guardados en caché con la versión anterior
      a = sonando = new Audio(src + '?v=' + VERSION_AUDIO);
      a.onended = function () { hecho = true; fin(); };
      a.onerror = respaldo;
      a.play().catch(respaldo);
    });
  };

  function hablar(texto, idioma, fin) {
    const s = window.speechSynthesis;
    if (!s || !texto) return fin();
    const pref = idioma === 'en' ? 'en' : 'es';
    const v = s.getVoices().filter(function (x) { return x.lang.indexOf(pref) === 0; })[0];
    if (!v) return fin(); // sin voz en ese idioma: mejor callar que leer con otra pronunciación
    const u = new SpeechSynthesisUtterance(texto);
    u.voice = v; u.lang = v.lang; u.onend = fin; u.onerror = fin;
    s.speak(u);
  }

  // Frases comunes de data/comun.json: E.frase('bien')
  E.frase = function (clave) {
    const f = E.comun.frases && E.comun.frases[clave];
    return f ? E.voz(f.audio, f.texto) : Promise.resolve();
  };
  E.numero = function (n) {
    const f = E.comun.numeros && E.comun.numeros[n - 1];
    return f ? E.voz(f.audio, f.texto) : Promise.resolve();
  };

  /* ---------- Efectos 8-bit sintetizados con Web Audio (0 KB de descarga) ---------- */
  let ctx = null;
  function tono(notas, onda) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      let t = ctx.currentTime;
      notas.forEach(function (n) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = onda || 'square';
        o.frequency.value = n[0];
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + n[1]);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + n[1]);
        t += n[1];
      });
    } catch (e) { /* sin audio: no es crítico */ }
  }
  E.sfx = {
    clic: function () { tono([[880, 0.05]]); },
    bien: function () { tono([[523, 0.08], [659, 0.08], [784, 0.16]]); },
    mal: function () { tono([[196, 0.12], [147, 0.22]], 'triangle'); },
    fiesta: function () { tono([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.12], [784, 0.08], [1047, 0.3]]); }
  };

  /* ---------- Almacenamiento ---------- */
  function leer(k, def, s) {
    try { return JSON.parse((s || localStorage).getItem(k)) || def; } catch (e) { return def; }
  }
  function escribir(k, v, s) {
    try { (s || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
  }

  // Perfiles y progreso. Por ahora en modo local; el adaptador de Supabase llega con el panel de maestra.
  E.store = {
    modo: 'local',
    estudiantes: function (curso) {
      return Promise.resolve(leer('er_students', []).filter(function (s) { return s.curso === curso; }));
    },
    guardarProgreso: function (student_id, activity_id, estrellas) {
      const p = leer('er_progress', []);
      p.push({ student_id: student_id, activity_id: activity_id, estrellas: estrellas, fecha: new Date().toISOString() });
      escribir('er_progress', p);
      return Promise.resolve();
    },
    // Mejor puntaje por actividad: { 't-mat-01': 3 }
    estrellas: function (student_id) {
      const m = {};
      leer('er_progress', []).forEach(function (r) {
        if (r.student_id === student_id) m[r.activity_id] = Math.max(m[r.activity_id] || 0, r.estrellas);
      });
      return Promise.resolve(m);
    }
  };

  // Niño que está jugando en esta tablet (se olvida al cerrar el navegador)
  E.alumno = function (a) {
    if (a !== undefined) escribir('er_alumno', a, sessionStorage);
    return leer('er_alumno', { id: 'invitado', nombre: 'Invitado' }, sessionStorage);
  };
})();
