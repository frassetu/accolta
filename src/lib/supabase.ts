import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Song = {
  id: number
  artiste: string
  album: string
  titre: string
  annee: number | null
  numero: number | null
  paroles: string | null
  created_at: string
}
