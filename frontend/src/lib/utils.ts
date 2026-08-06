import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  date: string | Date,
  opts?: Intl.DateTimeFormatOptions & { hideTime?: boolean }
): string {
  const d = typeof date === "string" ? new Date(date) : date
  const defaults: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  const merged = opts?.hideTime ? { ...defaults, hour: undefined, minute: undefined } : { ...defaults, ...opts }
  return new Intl.DateTimeFormat("en-US", merged).format(d)
}

export function formatCurrency(amount: number, currency: string = "ETB"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  return formatDate(d)
}
