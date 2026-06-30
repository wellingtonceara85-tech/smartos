import type { Timestamp } from "firebase/firestore";

export type PeriodFilter = "hoje" | "semana" | "mes" | "todos";

export function isWithinPeriod(timestamp: Timestamp, period: PeriodFilter, now: Date): boolean {
  if (period === "todos") return true;

  const date = timestamp.toDate();

  if (period === "hoje") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (period === "semana") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
