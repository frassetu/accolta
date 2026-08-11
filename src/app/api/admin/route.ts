import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { importRows } from '@/lib/importChansons'
import { checkAuth } from '@/lib/adminAuth'
import { pushUpsertToSheet, pushDeleteToSheet } from '@/lib/pushToSheet'

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
      const { data } = await supabase.from('chansons').select('*').order('id', { ascending: true }).range(from, from + 999)
      if (!data || data.length === 0) break
      all = [...all, ...data]
      if (data.length < 1000) break
      from += 1000
    }
    return NextResponse.json(all)
  }

  if (action === 'force-sync-sheet') {
    const url = process.env.SHEET_PUSH_URL
    const secret = process.env.SHEET_PUSH_SECRET
    if (!url || !secret) return NextResponse.json({ error: 'SHEET_PUSH_URL/SHEET_PUSH_SECRET non configurées' }, { status: 500 })

    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = 400
    // Tri explicite obligatoire : sans lui, l'ordre des lignes entre deux
    // appels séparés (un par paquet) n'est pas garanti stable côté
    // PostgREST, et une chanson peut se retrouver entre deux paquets et
    // n'être envoyée dans aucun des deux.
    const { data, count } = await supabase.from('chansons').select('*', { count: 'exact' }).order('id', { ascending: true }).range(offset, offset + limit - 1)
    if (!data) return NextResponse.json({ error: 'Lecture Supabase impossible' }, { status: 500 })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulkUpsert', secret, rows: data }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok || result.error) {
      return NextResponse.json({ error: result.error || `Erreur du script (${res.status})` }, { status: 500 })
    }

    const nextOffset = offset + data.length
    const hasMore = count !== null && nextOffset < count
    return NextResponse.json({ ok: true, processed: data.length, total: count, nextOffset, hasMore })
  }

  if (action === 'prune-orphans-sheet') {
    const url = process.env.SHEET_PUSH_URL
    const secret = process.env.SHEET_PUSH_SECRET
    if (!url || !secret) return NextResponse.json({ error: 'SHEET_PUSH_URL/SHEET_PUSH_SECRET non configurées' }, { status: 500 })

    const { data } = await supabase.from('chansons').select('id')
    const validIds = (data || []).map((r: any) => r.id)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pruneOrphans', secret, validIds }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok || result.error) {
      return NextResponse.json({ error: result.error || `Erreur du script (${res.status})` }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
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
    const { data, error } = await supabase.from('chansons').upsert(fields, { onConflict: 'artiste,titre,album' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data) waitUntil(pushUpsertToSheet(data as any))
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const { error } = await supabase.from('chansons').update(fields).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    waitUntil(pushUpsertToSheet({ id, ...fields } as any))
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
  waitUntil(pushDeleteToSheet(id))
  return NextResponse.json({ ok: true })
}
