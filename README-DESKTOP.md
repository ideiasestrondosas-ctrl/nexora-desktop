# Nexora Desktop

Aplicação nativa multiplataforma para processamento de media — Windows, macOS e Linux.

## Stack

| Camada        | Tecnologia                                     |
| ------------- | ---------------------------------------------- |
| Shell nativa  | Tauri 2.x (Rust)                               |
| Frontend      | React 19 + TypeScript + Tailwind CSS + Zustand |
| Sidecar       | Node.js 20 + TypeScript + esbuild              |
| Base de dados | SQLite (better-sqlite3 + rusqlite WAL)         |
| Build CI/CD   | GitHub Actions + Tauri Action                  |

## Pré-requisitos

- Node.js 20+
- Rust stable (`rustup update stable`)
- VS Build Tools 2022 (Windows) / Xcode CLI (macOS)
- FFmpeg e FFprobe (ver [Download de Binários](#download-de-binários))

## Instalação

```bash
git clone https://github.com/ideiasestrondosas-ctrl/nexora-desktop
cd nexora-desktop
npm install
```

## Desenvolvimento

```bash
# Frontend + Tauri em modo dev
npm run tauri dev

# Sidecar em modo dev (processo separado)
NEXORA_DB_PATH=/tmp/nexora.db npm run sidecar:dev

# Type-check do sidecar
npm run sidecar:check

# Testes
npm test
npm run test:coverage
```

## Download de Binários

O script descarrega FFmpeg e FFprobe pré-compilados para `src-tauri/binaries/`:

```bash
node scripts/download-media-binaries.js
```

Os binários são renomeados automaticamente para o formato Tauri:
`ffmpeg-x86_64-pc-windows-msvc.exe`, `ffmpeg-aarch64-apple-darwin`, etc.

## Build de Produção

```bash
# Build local
npm run tauri build

# Build sidecar (necessário antes de empacotar)
npm run sidecar:build
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`): corre em cada push para `main`/`dev` — tsc, clippy, cargo test
- **Build** (`.github/workflows/build.yml`): dispara em tags `v*` — gera instaladores para 3 plataformas e cria GitHub Release

Para criar uma release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Auto-updater

O auto-updater usa `tauri-plugin-updater` e verifica actualizações via GitHub Releases.

Para activar em produção:

1. Gerar chave de assinatura:
   ```bash
   npx tauri signer generate -w ~/.tauri/nexora-desktop.key
   ```
2. Adicionar ao repositório (GitHub Secrets):
   - `TAURI_SIGNING_PRIVATE_KEY` — conteúdo do ficheiro `.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — password da chave
3. Actualizar `pubkey` em `tauri.conf.json → plugins.updater.pubkey` com a chave pública gerada.

## Arquitectura do Sidecar

```
sidecar/
├── index.ts                    ← Entry point (NEXORA_DB_PATH obrigatório)
├── events.ts                   ← Protocolo stdout JSON
├── db.ts                       ← Wrapper SQLite
├── profiles/                   ← 6 perfis de transcode JSON
├── queue/
│   └── NexoraSimpleQueue.ts    ← Poll SQLite 2s, MAX_CONCURRENT=2
├── orchestrator/
│   └── NexoraDesktopOrchestrator.ts ← Pipeline 8 passos
└── workers/
    ├── ingest-worker.ts        ← SHA-256 + ffprobe metadata
    ├── qc-pre-worker.ts        ← Validação tamanho/codec/duração
    ├── transcode-worker.ts     ← GPU auto-detect (NVENC/AMF/QSV/CPU)
    ├── audio-worker.ts         ← EBU R128 dois passos
    ├── proxy-worker.ts         ← Proxy 960×540 veryfast
    ├── thumbnail-worker.ts     ← JPEG a 5s
    ├── qc-post-worker.ts       ← VMAF + SHA-256
    └── delivery-worker.ts      ← Cópia final + audit log
```

## Perfis de Transcode

| Perfil         | Vídeo                 | LUFS | VMAF |
| -------------- | --------------------- | ---- | ---- |
| `broadcast-hd` | 8000k H.264 1080p     | -23  | ≥93  |
| `broadcast-sd` | 3000k H.264 576p      | -23  | ≥90  |
| `web-4k`       | 20000k H.264 2160p    | -14  | ≥90  |
| `web-hd`       | 5000k H.264 1080p     | -14  | ≥90  |
| `proxy`        | 800k H.264 960×540    | -23  | ≥85  |
| `social`       | 4000k H.264 1080×1080 | -14  | ≥85  |

## Licença

Proprietário — Nexora Media Processing
