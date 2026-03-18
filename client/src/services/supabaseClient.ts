import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '🚨 [CRITICAL]: Missing Supabase Environment Variables!\n' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment config.\n' +
    'Authentication and Database features will fail gracefully.'
  );
}

// Fallbacks prevent frontend crash on initialization (deployment safety)
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);
