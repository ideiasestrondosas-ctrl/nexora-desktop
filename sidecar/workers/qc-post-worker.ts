import { execFile } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import type { JobContext } from '../orchestrator/NexoraDesktopOrchestrator';
import { getAsset, writeAuditLog } from '../db';
import { loadProfile } from '../profiles/types';
import type { ProgressCallback } from './types';

const execFileAsync = promisify(execFile);

export class QCPostWorker {
  async run(ctx: JobContext, onProgress: ProgressCallback): Promise<void> {
    const { assetId, assetPath, jobId, profile: profileName } = ctx;
    const asset = getAsset(assetId);
    if (!asset) throw new Error(`QC Post: asset ${assetId} não encontrado`);

    const profile = loadProfile(profileName);
    const reference = assetPath;
    const distorted = ctx.transcodedPath;
    if (!distorted) throw new Error('QC Post: transcodedPath em falta');

    onProgress(0.1);

    // SHA-256 do ficheiro final
    const sha256 = await computeSHA256(distorted);
    onProgress(0.2);

    // VMAF (opcional — apenas se ffmpeg suportar libvmaf)
    let vmafScore: number | null = null;
    try {
      vmafScore = await computeVMAF(reference, distorted);
    } catch {
      /* libvmaf não disponível — não crítico */
    }
    onProgress(0.8);

    // Verificar limiar VMAF quando disponível
    if (vmafScore !== null && vmafScore < profile.vmafThreshold) {
      throw new Error(
        `QC Post: VMAF ${vmafScore.toFixed(1)} abaixo do limiar ${profile.vmafThreshold} (${profileName})`
      );
    }

    ctx.vmafScore = vmafScore ?? undefined;

    writeAuditLog(jobId, 'qc-post:passed', {
      assetId,
      profileName,
      vmafScore,
      vmafThreshold: profile.vmafThreshold,
      sha256,
      distorted,
    });

    onProgress(1.0);
  }
}

async function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function computeVMAF(reference: string, distorted: string): Promise<number> {
  const ffmpegPath = process.env['FFMPEG_PATH'] ?? 'ffmpeg';

  // ADR-D010: execFile com array
  const { stderr } = await execFileAsync(
    ffmpegPath,
    [
      '-i', distorted,
      '-i', reference,
      '-lavfi', '[0:v][1:v]libvmaf=log_fmt=json:log_path=-',
      '-f', 'null', '-',
    ],
    { timeout: 3_600_000 }
  ).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? '' }));

  // ffmpeg escreve o JSON do VMAF no stderr
  const match = stderr.match(/"mean"\s*:\s*([\d.]+)/);
  if (match) return Number(match[1]);

  // Alternativa: VMAF agregado na linha de sumário
  const altMatch = stderr.match(/VMAF score:\s*([\d.]+)/i);
  if (altMatch) return Number(altMatch[1]);

  throw new Error('VMAF: não foi possível extrair pontuação');
}
