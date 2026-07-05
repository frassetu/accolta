// Helpers d'affichage partagés (avant : dupliqués dans 4-5 composants).

const AVATAR_COLORS = ['#7C5CFC', '#FC5C7C', '#5CF0FC', '#FCA85C', '#5CFC8E', '#FC5CEC']

// Couleur stable dérivée d'un nom (même nom => même couleur).
export function getColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Retire les accents pour que "valli" matche "Vallì", "un la so" matche "ùn la sò"…
export function normalize(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Neutralise les caractères qui ont un sens dans la syntaxe de filtre PostgREST
// (`,` `(` `)` séparateurs/groupes, `%` `_` `*` jokers, `\` échappement).
// Empêche qu'une saisie utilisateur ne casse ou détourne une requête .or()/.ilike().
export function sanitizeSearch(input: string): string {
  return input.replace(/[,()%*\\_]/g, ' ').trim()
}
