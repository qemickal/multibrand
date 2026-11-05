import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Without credentials, the app runs as an explicitly labeled local demo. Never
// direct a browser on another device to localhost as a fallback API.
export const sb = url && anonKey ? createClient(url, anonKey) : null
