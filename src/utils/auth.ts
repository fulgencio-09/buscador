export const MASTER_ROUTE_CODE = '8492';
const AUTH_STORAGE_KEY = 'pdf_route_auth_code_session';

export function normalizeAuthCode(input: string): string {
  return (input || '').trim().toUpperCase();
}

export function isValidLocalCode(input: string): boolean {
  const clean = normalizeAuthCode(input);
  return clean === MASTER_ROUTE_CODE || clean === 'PDF-8492';
}

export async function verifyRouteAuthCode(inputCode: string): Promise<{ valid: boolean; error?: string }> {
  const clean = normalizeAuthCode(inputCode);
  if (!clean) {
    return { valid: false, error: 'Por favor ingrese el código de autorización.' };
  }

  try {
    const res = await fetch('/api/auth/verify-route-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: clean })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, clean);
        return { valid: true };
      }
    }
  } catch (err) {
    console.warn('Verificando código en modo local:', err);
  }

  // Fallback check
  if (isValidLocalCode(clean)) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, clean);
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Código incorrecto. Solo el usuario autorizado puede cambiar la ruta.'
  };
}

export function getActiveAuthCode(): string | null {
  const code = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (code && isValidLocalCode(code)) {
    return code;
  }
  return null;
}

export function clearActiveAuthCode(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
