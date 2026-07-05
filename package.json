import { NextRequest, NextResponse } from 'next/server'

// Le secret est lu UNIQUEMENT côté serveur.
// On accepte aussi l'ancien nom NEXT_PUBLIC_* pour rester compatible avec
// les déploiements existants — mais comme plus aucun code client ne le lit,
// le mot de passe n'est plus embarqué dans le bundle JavaScript.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: '', password: '' }))

  if (!ADMIN_PASSWORD || email?.trim() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  // Cookie httpOnly : illisible par le JavaScript de la page, envoyé
  // automatiquement à chaque requête vers /api/admin.
  res.cookies.set('accolta_admin', ADMIN_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return res
}
