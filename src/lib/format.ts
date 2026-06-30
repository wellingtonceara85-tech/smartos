import type { Timestamp } from "firebase/firestore";

export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString("pt-BR");
}

export function isSameDay(timestamp: Timestamp, reference: Date): boolean {
  const date = timestamp.toDate();
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

export function isSameMonth(timestamp: Timestamp, reference: Date): boolean {
  const date = timestamp.toDate();
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}
