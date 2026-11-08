const UA = "museum-on-screen/0.1";

export async function getJson<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA, "AIC-User-Agent": UA },
    });
    if (res.ok) return (await res.json()) as T;
    if (attempt < retries && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
}

/** Run `fn` over items with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]!);
      }
    }),
  );
  return out;
}
