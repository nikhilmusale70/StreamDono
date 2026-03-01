import { type ClassValue, clsx } from "clsx"
import crypto from "crypto"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}
