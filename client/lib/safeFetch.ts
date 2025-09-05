export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetch(input: RequestInfo, init: SafeFetchOptions = {}) {
  const nativeFetch = (window as any).__nativeFetch || window.fetch.bind(window);

  const timeoutMs = init.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await nativeFetch(input, { ...init, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}
