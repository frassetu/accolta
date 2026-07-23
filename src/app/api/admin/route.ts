import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { importRows } from '@/lib/importChansons'
import { checkAuth } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'stats') {
    const { count: total } = await supabase.from('chansons').select('*', { count: 'exact', head: true })
    const { count: withLyrics } = await supabase.from('chansons').select('*', { count: 'exact', head: true }).not('paroles', 'is', null).neq('paroles', '')
    const { data: artistData } = await supabase.from('chansons').select('artiste')
    const artists = new Set(artistData?.map((r: any) => r.artiste)).size
    return NextResponse.json({ total, withLyrics, artists })
  }

  if (action === 'missing-lyrics') {
    const { data } = await supabase.from('chansons').select('id,artiste,album,titre,numero,annee,paroles').or('paroles.is.null,paroles.eq.')
    if (!data) return NextResponse.json([])
    return NextResponse.json(data)
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
    try {
      const result = await importRows(rows)
      return NextResponse.json(result)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  const body = await req.json()
  const { action, id, ...fields } = body

  if (action === 'upsert') {
    const { error } = await supabase.from('chansons').upsert(fields, { onConflict: 'artiste,titre,album' })
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
