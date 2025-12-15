export function generateApiToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `sk_${randomPart}`;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createTokenPreview(token: string): string {
  if (token.length < 16) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

// Costanti per i permessi disponibili
export const API_PERMISSIONS = [
  { value: 'famiglie:read', label: 'Famiglie - Lettura', group: 'Famiglie' },
  { value: 'famiglie:write', label: 'Famiglie - Scrittura', group: 'Famiglie' },
  { value: 'gruppi:read', label: 'Gruppi - Lettura', group: 'Gruppi' },
  { value: 'gruppi:write', label: 'Gruppi - Scrittura', group: 'Gruppi' },
  { value: 'invitati:read', label: 'Invitati - Lettura', group: 'Invitati' },
  { value: 'invitati:write', label: 'Invitati - Scrittura', group: 'Invitati' },
  { value: 'preferenze_alimentari_custom:read', label: 'Preferenze Alimentari - Lettura', group: 'Preferenze' },
  { value: 'preferenze_alimentari_custom:write', label: 'Preferenze Alimentari - Scrittura', group: 'Preferenze' },
  { value: 'tavoli:read', label: 'Tavoli - Lettura', group: 'Tavoli' },
  { value: 'tavoli:write', label: 'Tavoli - Scrittura', group: 'Tavoli' },
  { value: 'weddings:read', label: 'Wedding - Lettura', group: 'Wedding' },
  { value: 'weddings:write', label: 'Wedding - Scrittura', group: 'Wedding' },
] as const;

export type ApiPermission = typeof API_PERMISSIONS[number]['value'];
