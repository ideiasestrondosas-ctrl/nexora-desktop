import { describe, it, expect } from 'vitest';
import { writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
// @ts-expect-error — módulo JS puro sem tipos
import { sha256OfFile, compareChecksum } from '../scripts/lib/verify-checksum.js';

describe('verify-checksum (H1 — integridade dos binários media)', () => {
  it('compareChecksum devolve "missing" quando não há checksum fixado', () => {
    expect(compareChecksum(undefined, 'abc')).toBe('missing');
    expect(compareChecksum('', 'abc')).toBe('missing');
  });

  it('compareChecksum devolve "ok" quando coincide', () => {
    expect(compareChecksum('abc123', 'abc123')).toBe('ok');
  });

  it('compareChecksum devolve "mismatch" quando difere (adulteração/MITM)', () => {
    expect(compareChecksum('abc123', 'DEADBEEF')).toBe('mismatch');
  });

  it('sha256OfFile calcula o SHA-256 correcto do conteúdo', async () => {
    const path = join(tmpdir(), `nexora-checksum-test-${Date.now()}.bin`);
    await writeFile(path, 'nexora');
    try {
      // sha256("nexora") conhecido (vector fixo)
      const expected = '6684bd7ca5b118220b0b7f9996bc71c75359fec3242a3c8ce8a53e889081bf55';
      expect(await sha256OfFile(path)).toBe(expected);
    } finally {
      await rm(path, { force: true });
    }
  });
});
