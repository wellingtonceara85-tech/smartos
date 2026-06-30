export function formatOsNumero(numero: number): string {
  return `OS-${String(numero).padStart(4, "0")}`;
}
