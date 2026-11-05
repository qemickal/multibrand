import {createClient} from '@supabase/supabase-js'
export const sb=createClient(import.meta.env.VITE_SUPABASE_URL||'http://localhost',import.meta.env.VITE_SUPABASE_ANON_KEY||'sin-clave')
