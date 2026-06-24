/**
 * Datun cn() — dependency-free class merge (vendored; no clsx/tailwind-merge).
 * Joins truthy class values + de-dupes exact repeats. Swap for clsx+tailwind-merge
 * in the app repo if full Tailwind conflict-resolution is needed.
 */
type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean>;

function toVal(mix: ClassValue): string {
  if (!mix) return '';
  if (typeof mix === 'string' || typeof mix === 'number') return String(mix);
  if (Array.isArray(mix)) return mix.map(toVal).filter(Boolean).join(' ');
  if (typeof mix === 'object')
    return Object.keys(mix)
      .filter((k) => (mix as Record<string, boolean>)[k])
      .join(' ');
  return '';
}

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const cls of toVal(inputs).split(' ')) {
    if (cls && !seen.has(cls)) {
      seen.add(cls);
      out.push(cls);
    }
  }
  return out.join(' ');
}
