export function hasRequiredMethods(obj: any, methods: string[]): boolean {
  if (!obj) {
    return false;
  }
  return methods.every(
    method => method in obj && typeof obj[method] === 'function',
  );
}
