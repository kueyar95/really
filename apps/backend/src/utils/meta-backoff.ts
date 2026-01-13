export async function withBackoff<T>(fn: () => Promise<T>, max = 4): Promise<T> {
    let delay = 300;
    for (let i = 0; i < max - 1; i++) {
      try { return await fn(); } catch (e: any) {
        const status = e?.response?.status;
        if (status === 429 || status >= 500) { // rate limit o error transitorio
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 2, 4000);
          continue;
        }
        throw e;
      }
    }
    return await fn();
  }
  