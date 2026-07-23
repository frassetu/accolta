import { supabaseAdmin as supabase } from './supabaseAdmin'

export async function importRows(rows: any[]) {
  const mapped = rows.map((r: any) => ({
    artiste: r['Artistu'] || r['Artiste'] || '',
    album: r['Dischettu'] || r['Album'] || '',
    titre: r['Titulu'] || r['Titre'] || '',
    annee: r['Annata'] || r['Annee'] ? parseInt(r['Annata'] || r['Annee']) : null,
    numero: (r['Numeru'] || r['Numero'] || r['N°'] || r['No'] || r['N'])
      ? parseInt(r['Numeru'] || r['Numero'] || r['N°'] || r['No'] || r['N'])
      : null,
 paroles: r['Paroddi'] || r['Parolle'] || r['Paroles'] || null,
  })).filter((r: any) => r.artiste && r.titre)
  const exactDupKey = (r: any) => `${r.artiste}|||${r.titre}|||${r.album}`
  const seen = new Map<string, any>()
  for (const r of mapped) seen.set(exactDupKey(r), r)
  const deduped = Array.from(seen.values())
  const { error } = await supabase.from('chansons').upsert(deduped, { onConflict: 'artiste,titre,album' })
  if (error) throw new Error(error.message)
  return { total_in_file: rows.length, inserted: deduped.length, errors: [] as string[] }
}
