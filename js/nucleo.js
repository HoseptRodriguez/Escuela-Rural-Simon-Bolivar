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

  /* ---------- Web Audio compartido por voces y efectos ---------- */
  // Safari (iPad) solo deja sonar un <audio> que sale directo de un toque, así que las voces
  // encadenadas (instrucción + palabra en inglés, "¡Muy bien!") se bloqueaban. Con Web Audio
  // basta activar el contexto dentro de un toque; después todo puede sonar.
  let ctx = null;
  function contexto() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function desbloquear() {
    const c = contexto();
    if (!c) return;
    // Un sonido vacío dentro del toque termina de habilitar el audio en iOS
    const b = c.createBufferSource();
    b.buffer = c.createBuffer(1, 1, 22050);
    b.connect(c.destination);
    b.start(0);
  }
  ['touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, desbloquear, true); });

  /* ---------- Voz: mp3 pregrabado; la síntesis del navegador solo como respaldo ---------- */
  const VERSION_AUDIO = 4; // súbela si se regeneran las voces y algún navegador guardó las viejas
  // Se guarda el mp3 comprimido (pocos KB) y se decodifica al sonar: decodificado ocuparía
  // cientos de KB por frase, demasiado para tablets de 1 GB.
  const mp3 = {};
  let sonando = null, turno = 0;

  E.detenerVoz = function () {
    turno++;
    if (sonando) { try { sonando.stop(); } catch (e) { /* ya había terminado */ } sonando = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  };

  function cargar(src) {
    if (!mp3[src]) {
      // ?v= obliga a descargar de nuevo los audios guardados en caché con la versión anterior
      mp3[src] = fetch(src + '?v=' + VERSION_AUDIO).then(function (r) {
        if (!r.ok) throw new Error(src + ' ' + r.status);
        return r.arrayBuffer();
      });
      mp3[src].catch(function () { delete mp3[src]; });
    }
    return mp3[src].then(function (datos) {
      // decodeAudioData consume el buffer: se le pasa una copia
      return new Promise(function (ok, mal) { contexto().decodeAudioData(datos.slice(0), ok, mal); });
    });
  }

  E.voz = function (src, texto, idioma) {
    E.detenerVoz();
    const mio = turno;
    return new Promise(function (fin) {
      if (!src || !contexto()) return hablar(texto, idioma, fin);
      cargar(src).then(function (buf) {
        if (mio !== turno) return; // mientras se descargaba se pidió otra voz
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.connect(ctx.destination);
        s.onended = function () {
          if (sonando === s) sonando = null;
          if (mio === turno) fin();
        };
        sonando = s;
        s.start(0);
      }, function () {
        if (mio === turno) hablar(texto, idioma, fin);
      });
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
  function tono(notas, onda) {
    try {
      if (!contexto()) return;
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
