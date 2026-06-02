// Verificação de integridade (SHA-256) dos binários media descarregados.
// Lógica pura e testável, partilhada pelo download-media-binaries.js.

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/** Calcula o SHA-256 (hex) do conteúdo de um ficheiro. */
export async function sha256OfFile(path) {
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Compara um checksum esperado (do lock) com o obtido do ficheiro.
 * @returns {'ok'|'missing'|'mismatch'} — 'missing' quando não há checksum fixado.
 */
export function compareChecksum(expected, actual) {
  if (!expected) return 'missing';
  return expected === actual ? 'ok' : 'mismatch';
}
