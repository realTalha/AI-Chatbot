// Simple utility to merge class names
export function cn(...classes: (string | undefined | null | false | ((state: any) => string | undefined))[]) {
  return classes.map(cls => typeof cls === 'function' ? cls({}) : cls).filter(Boolean).join(' ')
}
