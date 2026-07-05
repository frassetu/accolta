import { supabase, Song } from './supabase'

// Cache mémoire partagé : la table complète n'est téléchargée qu'UNE fois,
// puis réutilisée quand on change d'onglet (avant : chaque onglet refaisait
// un select('*') sur toutes les chansons, paroles comprises).
let cache: Promise<Song[]> | null = null

async function fetchAllSongs(): Promise<Song[]> {
  let all: Song[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('chansons')
      .select('*')
      .range(from, from + pageSize - 1)
      .order('artiste')
    if (error || !data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

export function getAllSongs(): Promise<Song[]> {
  if (!cache) cache = fetchAllSongs()
  return cache
}

// À appeler après une modification admin pour forcer un rechargement.
export function invalidateSongs(): void {
  cache = null
}
