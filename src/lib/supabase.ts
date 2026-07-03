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
  view_count?: number
}

// Track song views globally (shared across all users) via Supabase.
// Requires the `view_count` column + `increment_view_count` function (see README / SQL setup).
export function trackView(songId: number) {
  if (typeof window === 'undefined') return
  supabase.rpc('increment_view_count', { song_id: songId }).then(({ error }) => {
    if (error) console.error('trackView error:', error.message)
  })
}
