import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Credentials } from '../shared/types.ts';

export { isTauri };
export async function desktopGet<T>(path: string, credentials: Pick<Credentials, 'user' | 'password'> & { server: string }, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  // Rust requests time out after 30s. Abort stops waiting and prevents stale UI updates.
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException('Verbindung abgebrochen.', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    invoke<T>('svws_get', { path, ...credentials })
      .then(resolve, error => reject(new Error(String(error))))
      .finally(() => signal?.removeEventListener('abort', abort));
  });
}
export async function saveDesktopCsv(name: string, content: string): Promise<boolean> {
  return invoke<boolean>('save_csv', { name, content }).catch(error => { throw new Error(String(error)); });
}
