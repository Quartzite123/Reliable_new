/** Joins class names, dropping falsy values — no external dependency needed for this project's scale. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
