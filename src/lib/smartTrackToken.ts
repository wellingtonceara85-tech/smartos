const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateSmartTrackToken(): string {
  const randomValues = new Uint32Array(12);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => ALPHABET[value % ALPHABET.length]).join("");
}
