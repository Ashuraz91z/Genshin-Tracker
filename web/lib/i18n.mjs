// Two languages: French (default, served at /) and English (served at /en/, same routes).
// proxy.js rewrites /en/... to the French route and sets x-locale: en.
export const locales = ['fr', 'en'];

export function localeFromHeaders(headers) {
  return headers.get('x-locale') === 'en' ? 'en' : 'fr';
}

// Prefix an internal path with the current language. External URLs and #anchors are returned unchanged.
export function localePath(locale, href) {
  if (locale !== 'en' || typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  return href === '/' ? '/en' : '/en' + href;
}
