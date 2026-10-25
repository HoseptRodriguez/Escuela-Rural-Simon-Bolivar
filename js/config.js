/*
 * Configuración de Supabase (opcional).
 * Si se deja vacía, la app funciona en modo local (localStorage de cada tablet).
 *
 * Cómo configurarla (detalles en README.md):
 *  1. Crea un proyecto gratis en https://supabase.com
 *  2. Ejecuta supabase/esquema.sql en el editor SQL (llega con el panel de maestra).
 *  3. Copia aquí "Project URL" y la clave "anon public" (Settings > API).
 *     La clave anon es pública por diseño; la protegen las políticas RLS.
 *     NUNCA pongas aquí la clave "service_role".
 */
window.ESCUELA_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
