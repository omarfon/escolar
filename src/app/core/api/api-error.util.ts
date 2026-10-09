/** Mensaje legible cuando el proxy no alcanza el backend (ECONNREFUSED / ECONNRESET → 500 genérico). */
export function mensajeErrorHttp(err: unknown, fallback: string): string {
  const http = err as { status?: number; message?: string; error?: { message?: string | string[] } };
  const raw = http.error?.message ?? http.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw;
  if (
    http.status === 0 ||
    (http.status === 500 && (!msg || String(msg).startsWith('Http failure response')))
  ) {
    return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución (puerto 3000).';
  }
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
}
