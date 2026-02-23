import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ✅ FIX: validación de env vars — antes fallaba silenciosamente con errores crípticos
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Supabase] Faltan variables de entorno.\n' +
    'Verificá que VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY estén definidas en tu .env'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // ✅ FIX: se eliminó el override de fetch — no hacía nada útil y agregaba overhead
});