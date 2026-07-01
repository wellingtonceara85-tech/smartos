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

export function getDisplayNameFromEmail(email?: string | null) {
  const rawName = email?.split("@")[0] ?? "";
  const displayName = rawName
    .replace(/[0-9._-]+$/, "")
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const initial = (displayName || rawName).charAt(0).toUpperCase() || "U";
  return { displayName, initial, rawName };
}

export function getInitials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
