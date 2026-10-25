# Escuela Rural Simón Bolívar · Plataforma educativa

Web estática (HTML + CSS + JavaScript, sin frameworks) para Transición, Primero y Segundo.
Pensada para tablets con Windows 7 y Chrome 109: carga inicial < 100 KB.

## Estructura

```
index.html            Página única (navegación con #/)
css/estilos.css       Estilo retro 8-bit
js/config.js          Claves de Supabase (opcional)
js/nucleo.js          Utilidades, voz (mp3), efectos 8-bit (Web Audio) y almacenamiento
js/motor.js           Marco común de actividades: barra, mascota, rondas, estrellas
js/tipos/*.js         Los 4 tipos: opcion, arrastrar, memoria, tocar
js/app.js             Pantallas: inicio, perfiles, materias, actividades
data/cursos.json      Cursos y materias
data/comun.json       Frases y números que dice la mascota
data/<curso>/<materia>.json   Actividades
img/ui, img/obj       Ilustraciones SVG propias
audio/                Voces mp3 (generadas o grabadas)
tools/generar-audio.ps1   Genera los mp3 que falten desde los JSON
```

## Agregar una actividad

1. Abre `data/<curso>/<materia>.json` (o créalo: la materia se activa sola) y añade un objeto a `actividades`
   con `id` único, `titulo`, `tipo`, `imagen`, `instruccion`, `audio`, `dba` y `rondas`.
   El formato de cada tipo está explicado al inicio de su archivo en `js/tipos/`.
2. Sube las imágenes a `img/` (SVG, o WebP/PNG de máximo 100 KB).
3. Audio: graba los mp3 con el nombre indicado en `audio`, o genéralos con voces neuronales
   (Salomé, de Colombia, en español y Ana en inglés):
   `powershell -ExecutionPolicy Bypass -File tools\generar-audio.ps1`
   Requiere internet, `pip install --user edge-tts` y ffmpeg (`winget install Gyan.FFmpeg`).
   Sin internet: añade `-Motor sapi` (voces de Windows, más robóticas). No sobrescribe grabaciones existentes.

## Probar en local

Cualquier servidor estático sirve, por ejemplo: `npx serve .` y abrir http://localhost:3000.
Abrir `index.html` con doble clic no funciona (el navegador bloquea la lectura de los JSON).

## Desplegar en Vercel

1. En vercel.com: **Add New → Project → Import** este repositorio de GitHub.
2. Framework Preset: **Other**. Sin comando de build. Output directory: la raíz.
3. **Deploy**. Cada `git push` a `main` vuelve a publicar.

## Supabase (opcional, para juntar el progreso de las 17 tablets)

Sin configurar, cada tablet guarda el progreso en su navegador (modo local).
La conexión con Supabase llega con el panel de maestra; los pasos serán:

1. Crear un proyecto gratis en supabase.com.
2. Ejecutar el SQL de `supabase/esquema.sql` (tablas `students` y `progress` con políticas RLS).
3. Copiar **Project URL** y la clave **anon public** en `js/config.js`.
   Nunca uses la clave `service_role` en este proyecto.
