/**
 * VersÃƒÂ£o ÃƒÂºnica da aplicaÃƒÂ§ÃƒÂ£o Nexora Desktop.
 * Actualizar aqui em cada release Ã¢â‚¬â€ propaga automaticamente
 * para todos os sÃƒÂ­tios que mostram a versÃƒÂ£o.
 */
export const APP_VERSION = '0.31.2-beta.1';

export interface VersionEntry {
  version: string;
  description: string;
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '0.31.2-beta.1',
    description: 'v0.31.2-beta.1.',
  },
  {
    version: '0.30.11-beta.1',
    description:
      'v0.30.11-beta.1: i18n pipeline steps com hifem, HelpModal/IngestModal/BatchModal bg solido, engine SEA pkg --no-bytecode, QueuePill TopBar tempo real, AssetDetailPage reactivo via useJobsStore, dropdown perfil legivel.',
  },
  {
    version: '0.30.9-beta.1',
    description:
      'v0.30.9-beta.1: 7 fixes UI/UX Ã¢â‚¬â€ HelpModal contraste claro/escuro, library badges modo claro, hover overlay escuro, badge verificacao versao inline, link release notes, atalho desktop Windows/Linux/macOS, CHANGELOG encoding.',
  },
  {
    version: '0.30.3-beta.1',
    description:
      'v0.30.3-beta.1: Auto-updater operacional ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â modal de actualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no startup com versÃƒÆ’Ã‚Â£o actual/nova e release notes; assinatura de instaladores activa; hooks de sessÃƒÆ’Ã‚Â£o Claude Code com notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Windows.',
  },
  {
    version: '0.30.2-beta.1',
    description:
      'v0.30.2-beta.1: SEA Engine (nexora-engine standalone, sem Node.js), System Diagnostics UI, Help Manual i18n fixes, CI fixes cargo fmt + prettier.',
  },
  {
    version: '0.30.1-beta.1',
    description:
      'v0.30.1-beta.1: Fix WSearch indexing (NTFS NotContentIndexed em vez de COM), correcÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de parsing de versÃƒÆ’Ã‚Âµes pre-release no sync.ps1, suporte completo a alpha/beta/rc no menu de versÃƒÆ’Ã‚Â£o.',
  },
  {
    version: '0.30.0-beta.1',
    description:
      'v0.30.0-beta.1: Beta fechada ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Watch Folders debounce (ficheiros grandes), SQLite WAL tuning, graceful shutdown de threads, cloud upload deduplicado, VisualComparatorPlayer split-screen para comparar original vs processado.',
  },
  {
    version: '0.29.0-alpha.1',
    description:
      'v0.29.0-alpha.1: Alpha Instrumentada ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Watch Folders, Onboarding Wizard, Telemetria local opt-in, Bug Report integrado, mapeamento automÃƒÆ’Ã‚Â¡tico de erros do pipeline, keychain OS para credenciais cloud.',
  },
  {
    version: '0.28.0',
    description:
      'v0.28.0: Platform-Adaptive UX ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â design tokens CSS por plataforma (Windows/macOS/Linux), WindowControls.tsx (botÃƒÆ’Ã‚Âµes min/max/close Fluent), efeitos Mica (Windows 11) e Vibrancy (macOS), scrollbars nativas.',
  },
  {
    version: '0.27.0',
    description:
      'v0.27.0: SeguranÃƒÆ’Ã‚Â§a cloud ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â credenciais armazenadas no OS keychain (Windows Credential Manager / macOS Keychain / Linux Secret Service), fix path traversal SMB, auditoria de seguranÃƒÆ’Ã‚Â§a completa.',
  },
  {
    version: '0.26.0',
    description:
      'v0.26.0: CI/CD release pipeline, sync automÃƒÆ’Ã‚Â¡tico CHANGELOG + SYNC-STATE, check-translations gate, builds assinados Windows/macOS.',
  },
  {
    version: '0.25.0',
    description:
      'v0.25.0: Cloud File Browser ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â navegar, descarregar e apagar ficheiros em FTP/SFTP/SMB/S3/GDrive directamente nas definiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes; cloud upload para destinos agora accionado automaticamente apÃƒÆ’Ã‚Â³s processamento; GDrive upsert (PATCH se ficheiro jÃƒÆ’Ã‚Â¡ existe); correcÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes GDrive Browse (base_path ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ folder ID, raiz My Drive).',
  },
  {
    version: '0.24.0',
    description:
      'v0.24.0: sistema de logging completo (ficheiros rotativos, verbosidade, aba Logs nas Settings, envio ao developer); settings aplicam ao vivo (idioma e concorrÃƒÆ’Ã‚Âªncia); cache display na aba System; GDrive OAuth melhorado (URL clicÃƒÆ’Ã‚Â¡vel + cÃƒÆ’Ã‚Â³digo copiÃƒÆ’Ã‚Â¡vel); CloudDestinationPicker no BatchSubmitModal; MinIO local isolado para desenvolvimento.',
  },
  {
    version: '0.23.0',
    description:
      'v0.23.0: navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o in-app para ficheiros processados, popup de reprocessamento em foreground (portal), Pipeline Summary clicÃƒÆ’Ã‚Â¡vel com painel expansÃƒÆ’Ã‚Â­vel, delete e factory reset com autorizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o explÃƒÆ’Ã‚Â­cita de ficheiros, 6 novas chaves i18n.',
  },
  {
    version: '0.22.0',
    description:
      'v0.22.0: MediaInfo com tabs horizontais, caminhos original/processado visÃƒÆ’Ã‚Â­veis, reprocessar com selector de perfil, botÃƒÆ’Ã‚Âµes explorador separados (original/processado), download de ficheiro processado, fila com navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para asset, dashboard scrollÃƒÆ’Ã‚Â¡vel, registo de actividade, 16 novas chaves i18n, manual do utilizador.',
  },
  {
    version: '0.21.0',
    description:
      'v0.21.0: sidecar reconstruÃƒÆ’Ã‚Â­do com todos os fixes activos, max_concurrent_jobs funcional, output_dir migrado automaticamente de temp para Videos/Nexora Output, filenames nos jobs da fila, log de acÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, feedback de retry/cancel.',
  },
  {
    version: '0.20.0',
    description:
      'v0.20.0: output_dir padrÃƒÆ’Ã‚Â£o para Videos/Nexora Output, MediaInfo original vs processado com toggle, caminho do ficheiro visÃƒÆ’Ã‚Â­vel no player, SHA-256 e TAGS no Copy All, limpeza GitHub, Videos_Tests incluÃƒÆ’Ã‚Â­dos.',
  },
  {
    version: '0.19.0',
    description:
      'v0.19.0: suporte H.265/HEVC e VP9, BatchSubmitModal com estimativas, thumbnails automÃƒÆ’Ã‚Â¡ticos, player inline na Biblioteca, MediaInfo detalhado no Detalhe de Asset, correcÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes VMAF Windows, navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de detalhes clicÃƒÆ’Ã‚Â¡vel.',
  },
  {
    version: '0.18.0',
    description:
      'Auditoria v0.18.0: drag-drop corrigido, sidecar stateless, CSP estrita, least-privilege, ESLint+Prettier, Husky, testes de componentes, recharts, Radix Dialog, sonner, tauri-plugin-store, telemetria opt-in.',
  },
  {
    version: '0.17.0',
    description:
      'EstabilizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: README completo, manual do utilizador, guia de ecrÃƒÆ’Ã‚Â£s, HelpOverlay integrado.',
  },
  {
    version: '0.16.0',
    description:
      'UI/UX overhaul completo: TopBar com mÃƒÆ’Ã‚Â©tricas circulares, definiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por tabs (Geral, Interface, Sistema, AvanÃƒÆ’Ã‚Â§ado, Sobre), pipeline de 8 fases com resumo visual, aprovaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de quarentena, VMAF activo, perfis com dropdown, tema e idioma.',
  },
  {
    version: '0.15.0',
    description:
      'Pipeline de quarentena QC prÃƒÆ’Ã‚Â©/pÃƒÆ’Ã‚Â³s, estados qc_quarantined e qc_rejected, aprovaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o manual de jobs, VMAF scoring com libvmaf.',
  },
  {
    version: '0.14.0',
    description:
      'Workers FFmpeg bundled, GPU auto-detect (NVENC/AMF/QSV), sidecar Node.js estÃƒÆ’Ã‚Â¡vel, logs estruturados, fila em memÃƒÆ’Ã‚Â³ria + SQLite.',
  },
  {
    version: '0.13.0',
    description:
      'Factory reset, system tray, schema SQLite completo, deep links nexora://, auto-updater Tauri built-in.',
  },
  {
    version: '0.12.0',
    description:
      'Frontend React 19 + Zustand + Tailwind v4, drag-and-drop nativo Tauri, notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do SO.',
  },
  {
    version: '0.11.0',
    description: 'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description:
      'ProtÃƒÆ’Ã‚Â³tipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
