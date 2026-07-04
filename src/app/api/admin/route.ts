import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Secret lu uniquement côté serveur (fallback sur l'ancien nom NEXT_PUBLIC_*
// pour ne rien casser sur les déploiements existants).
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

function checkAuth(req: NextRequest) {
  if (!ADMIN_PASSWORD) return false
  // Authentification via le cookie httpOnly posé au login (le client n'a
  // plus jamais à manipuler le mot de passe).
  const cookie = req.cookies.get('accolta_admin')?.value
  return cookie === ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'stats') {
    const { count: total } = await supabase.from('chansons').select('*', { count: 'exact', head: true })
    const { count: withLyrics } = await supabase.from('chansons').select('*', { count: 'exact', head: true }).not('paroles', 'is', null)
    const { data: artistData } = await supabase.from('chansons').select('artiste')
    const artists = new Set(artistData?.map((r: any) => r.artiste)).size
    return NextResponse.json({ total, withLyrics, artists })
  }

  if (action === 'export') {
    let all: any[] = []
    let from = 0
    while (true) {
      const { data } = await supabase.from('chansons').select('*').range(from, from + 999)
      if (!data || data.length === 0) break
      all = [...all, ...data]
      if (data.length < 1000) break
      from += 1000
    }
    return NextResponse.json(all)
  }

  const id = searchParams.get('id')
  if (id) {
    const { data } = await supabase.from('chansons').select('*').eq('id', id).single()
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
    const mapped = rows.map((r: any) => ({
      artiste: r['Artistu'] || r['Artiste'] || '',
      album: r['Dischettu'] || r['Album'] || '',
      titre: r['Titulu'] || r['Titre'] || '',
      annee: r['Annata'] || r['Annee'] ? parseInt(r['Annata'] || r['Annee']) : null,
      numero: r['Numeru'] || r['Numero'] ? parseInt(r['Numeru'] || r['Numero']) : null,
      paroles: r['Parolle'] || r['Paroles'] || null,
    })).filter((r: any) => r.artiste && r.titre)
    const deduped = mapped.filter((r: any, i: number) =>
      mapped.findIndex((x: any) => x.artiste === r.artiste && x.titre === r.titre) === i
    )
    const { data, error } = await supabase.from('chansons').upsert(deduped, { onConflict: 'artiste,titre' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ total_in_file: rows.length, after_dedup: deduped.length, inserted: deduped.length, errors: [] })
  }

  const body = await req.json()
  const { action, id, ...fields } = body

  if (action === 'upsert') {
    const { error } = await supabase.from('chansons').upsert(fields, { onConflict: 'artiste,titre' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const { error } = await supabase.from('chansons').update(fields).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
  const { error } = await supabase.from('chansons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
