export function getPublicAssetUrl(path: string, base = import.meta.env.BASE_URL): string {
  if (/^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(path)) {
    return path;
  }

  const normalizedBase = base.endsWith('/') || base === '' ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}
