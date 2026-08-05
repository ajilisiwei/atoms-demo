import { randomBytes } from "crypto";

// Unambiguous lowercase alphabet (no 0/o/1/l) for public URLs.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateSlug(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
