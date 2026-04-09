import { useEffect } from 'react';

const ensureMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const ensureLink = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

export function useSeoMeta({
  title,
  description,
  keywords = [],
  canonicalPath = '/',
  structuredData = null
} = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    if (title) {
      document.title = title;
      ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
      ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
    }

    if (description) {
      ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
      ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
      ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
    }

    if (keywords.length > 0) {
      ensureMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', keywords.join(', '));
    }

    const canonical = ensureLink('link[rel="canonical"]', { rel: 'canonical' });
    canonical.setAttribute('href', `${window.location.origin}${canonicalPath}`);

    if (structuredData) {
      const scriptId = 'nevkoder-seo-jsonld';
      let script = document.head.querySelector(`#${scriptId}`);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    return undefined;
  }, [title, description, keywords, canonicalPath, structuredData]);
}