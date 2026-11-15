const TRUSTED_PUBLIC_ORIGINS = new Set([
  "https://ghosthunt.com.br",
  "https://www.ghosthunt.com.br",
  "https://inglorious.ghosthunt.com.br",
]);

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const normalizedOrigin = new URL(origin).origin;
    const requestOrigin = new URL(request.url).origin;

    return normalizedOrigin === requestOrigin || TRUSTED_PUBLIC_ORIGINS.has(normalizedOrigin);
  } catch {
    return false;
  }
}
