/**
 * VersÃ£o Ãºnica da aplicaÃ§Ã£o Nexora Desktop.
 * Actualizar aqui em cada release â€” propaga automaticamente
 * para todos os sÃ­tios que mostram a versÃ£o.
 */
export const APP_VERSION = '0.30.11-beta.1';

export interface VersionEntry {
  version: string;
  description: string;
}


  {
    version: '0.30.11-beta.1',
    description:
      'v0.30.11-beta.1.',
  },
  {
    version: '0.30.9-beta.1',
    description:
      'v0.30.9-beta.1: 7 fixes UI/UX â€” HelpModal contraste claro/escuro, library badges modo claro, hover overlay escuro, badge verificacao versao inline, link release notes, atalho desktop Windows/Linux/macOS, CHANGELOG encoding.',
  },
  {
    version: '0.30.3-beta.1',
    description:
      'v0.30.3-beta.1: Auto-updater operacional Ã¢â‚¬â€ modal de actualizaÃƒÂ§ÃƒÂ£o no startup com versÃƒÂ£o actual/nova e release notes; assinatura de instaladores activa; hooks de sessÃƒÂ£o Claude Code com notificaÃƒÂ§ÃƒÂ£o Windows.',
  },
  {
    version: '0.30.2-beta.1',
    description:
      'v0.30.2-beta.1: SEA Engine (nexora-engine standalone, sem Node.js), System Diagnostics UI, Help Manual i18n fixes, CI fixes cargo fmt + prettier.',
  },
  {
    version: '0.30.1-beta.1',
    description:
      'v0.30.1-beta.1: Fix WSearch indexing (NTFS NotContentIndexed em vez de COM), correcÃƒÂ§ÃƒÂ£o de parsing de versÃƒÂµes pre-release no sync.ps1, suporte completo a alpha/beta/rc no menu de versÃƒÂ£o.',
  },
  {
    version: '0.30.0-beta.1',
    description:
      'v0.30.0-beta.1: Beta fechada Ã¢â‚¬â€ Watch Folders debounce (ficheiros grandes), SQLite WAL tuning, graceful shutdown de threads, cloud upload deduplicado, VisualComparatorPlayer split-screen para comparar original vs processado.',
  },
  {
    version: '0.29.0-alpha.1',
    description:
      'v0.29.0-alpha.1: Alpha Instrumentada Ã¢â‚¬â€ Watch Folders, Onboarding Wizard, Telemetria local opt-in, Bug Report integrado, mapeamento automÃƒÂ¡tico de erros do pipeline, keychain OS para credenciais cloud.',
  },
  {
    version: '0.28.0',
    description:
      'v0.28.0: Platform-Adaptive UX Ã¢â‚¬â€ design tokens CSS por plataforma (Windows/macOS/Linux), WindowControls.tsx (botÃƒÂµes min/max/close Fluent), efeitos Mica (Windows 11) e Vibrancy (macOS), scrollbars nativas.',
  },
  {
    version: '0.27.0',
    description:
      'v0.27.0: SeguranÃƒÂ§a cloud Ã¢â‚¬â€ credenciais armazenadas no OS keychain (Windows Credential Manager / macOS Keychain / Linux Secret Service), fix path traversal SMB, auditoria de seguranÃƒÂ§a completa.',
  },
  {
    version: '0.26.0',
    description:
      'v0.26.0: CI/CD release pipeline, sync automÃƒÂ¡tico CHANGELOG + SYNC-STATE, check-translations gate, builds assinados Windows/macOS.',
  },
  {
    version: '0.25.0',
    description:
      'v0.25.0: Cloud File Browser Ã¢â‚¬â€ navegar, descarregar e apagar ficheiros em FTP/SFTP/SMB/S3/GDrive directamente nas definiÃƒÂ§ÃƒÂµes; cloud upload para destinos agora accionado automaticamente apÃƒÂ³s processamento; GDrive upsert (PATCH se ficheiro jÃƒÂ¡ existe); correcÃƒÂ§ÃƒÂµes GDrive Browse (base_path Ã¢â€ â€™ folder ID, raiz My Drive).',
  },
  {
    version: '0.24.0',
    description:
      'v0.24.0: sistema de logging completo (ficheiros rotativos, verbosidade, aba Logs nas Settings, envio ao developer); settings aplicam ao vivo (idioma e concorrÃƒÂªncia); cache display na aba System; GDrive OAuth melhorado (URL clicÃƒÂ¡vel + cÃƒÂ³digo copiÃƒÂ¡vel); CloudDestinationPicker no BatchSubmitModal; MinIO local isolado para desenvolvimento.',
  },
  {
    version: '0.23.0',
    description:
      'v0.23.0: navegaÃƒÂ§ÃƒÂ£o in-app para ficheiros processados, popup de reprocessamento em foreground (portal), Pipeline Summary clicÃƒÂ¡vel com painel expansÃƒÂ­vel, delete e factory reset com autorizaÃƒÂ§ÃƒÂ£o explÃƒÂ­cita de ficheiros, 6 novas chaves i18n.',
  },
  {
    version: '0.22.0',
    description:
      'v0.22.0: MediaInfo com tabs horizontais, caminhos original/processado visÃƒÂ­veis, reprocessar com selector de perfil, botÃƒÂµes explorador separados (original/processado), download de ficheiro processado, fila com navegaÃƒÂ§ÃƒÂ£o para asset, dashboard scrollÃƒÂ¡vel, registo de actividade, 16 novas chaves i18n, manual do utilizador.',
  },
  {
    version: '0.21.0',
    description:
      'v0.21.0: sidecar reconstruÃƒÂ­do com todos os fixes activos, max_concurrent_jobs funcional, output_dir migrado automaticamente de temp para Videos/Nexora Output, filenames nos jobs da fila, log de acÃƒÂ§ÃƒÂµes, feedback de retry/cancel.',
  },
  {
    version: '0.20.0',
    description:
      'v0.20.0: output_dir padrÃƒÂ£o para Videos/Nexora Output, MediaInfo original vs processado com toggle, caminho do ficheiro visÃƒÂ­vel no player, SHA-256 e TAGS no Copy All, limpeza GitHub, Videos_Tests incluÃƒÂ­dos.',
  },
  {
    version: '0.19.0',
    description:
      'v0.19.0: suporte H.265/HEVC e VP9, BatchSubmitModal com estimativas, thumbnails automÃƒÂ¡ticos, player inline na Biblioteca, MediaInfo detalhado no Detalhe de Asset, correcÃƒÂ§ÃƒÂµes VMAF Windows, navegaÃƒÂ§ÃƒÂ£o de detalhes clicÃƒÂ¡vel.',
  },
  {
    version: '0.18.0',
    description:
      'Auditoria v0.18.0: drag-drop corrigido, sidecar stateless, CSP estrita, least-privilege, ESLint+Prettier, Husky, testes de componentes, recharts, Radix Dialog, sonner, tauri-plugin-store, telemetria opt-in.',
  },
  {
    version: '0.17.0',
    description:
      'EstabilizaÃƒÂ§ÃƒÂ£o e documentaÃƒÂ§ÃƒÂ£o: README completo, manual do utilizador, guia de ecrÃƒÂ£s, HelpOverlay integrado.',
  },
  {
    version: '0.16.0',
    description:
      'UI/UX overhaul completo: TopBar com mÃƒÂ©tricas circulares, definiÃƒÂ§ÃƒÂµes por tabs (Geral, Interface, Sistema, AvanÃƒÂ§ado, Sobre), pipeline de 8 fases com resumo visual, aprovaÃƒÂ§ÃƒÂ£o de quarentena, VMAF activo, perfis com dropdown, tema e idioma.',
  },
  {
    version: '0.15.0',
    description:
      'Pipeline de quarentena QC prÃƒÂ©/pÃƒÂ³s, estados qc_quarantined e qc_rejected, aprovaÃƒÂ§ÃƒÂ£o manual de jobs, VMAF scoring com libvmaf.',
  },
  {
    version: '0.14.0',
    description:
      'Workers FFmpeg bundled, GPU auto-detect (NVENC/AMF/QSV), sidecar Node.js estÃƒÂ¡vel, logs estruturados, fila em memÃƒÂ³ria + SQLite.',
  },
  {
    version: '0.13.0',
    description:
      'Factory reset, system tray, schema SQLite completo, deep links nexora://, auto-updater Tauri built-in.',
  },
  {
    version: '0.12.0',
    description:
      'Frontend React 19 + Zustand + Tailwind v4, drag-and-drop nativo Tauri, notificaÃƒÂ§ÃƒÂµes do SO.',
  },
  {
    version: '0.11.0',
    description: 'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description: 'ProtÃƒÂ³tipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
