/**
 * VersÃ£o Ãºnica da aplicaÃ§Ã£o Nexora Desktop.
 * Actualizar aqui em cada release â€” propaga automaticamente
 * para todos os sÃ­tios que mostram a versÃ£o.
 */
export const APP_VERSION = '0.30.9-beta.1';

export interface VersionEntry {
  version: string;
  description: string;
}


  {
    version: '0.30.9-beta.1',
    description:
      'v0.30.9-beta.1: botao 'Criar atalho no desktop' adaptativo por plataforma, commands create_windows_shortcut, create_desktop_shortcut, create_macos_alias, hover overlay escuro em modo claro + badges....',
  },
  {
    version: '0.30.3-beta.1',
    description:
      'v0.30.3-beta.1: Auto-updater operacional â€” modal de actualizaÃ§Ã£o no startup com versÃ£o actual/nova e release notes; assinatura de instaladores activa; hooks de sessÃ£o Claude Code com notificaÃ§Ã£o Windows.',
  },
  {
    version: '0.30.2-beta.1',
    description:
      'v0.30.2-beta.1: SEA Engine (nexora-engine standalone, sem Node.js), System Diagnostics UI, Help Manual i18n fixes, CI fixes cargo fmt + prettier.',
  },
  {
    version: '0.30.1-beta.1',
    description:
      'v0.30.1-beta.1: Fix WSearch indexing (NTFS NotContentIndexed em vez de COM), correcÃ§Ã£o de parsing de versÃµes pre-release no sync.ps1, suporte completo a alpha/beta/rc no menu de versÃ£o.',
  },
  {
    version: '0.30.0-beta.1',
    description:
      'v0.30.0-beta.1: Beta fechada â€” Watch Folders debounce (ficheiros grandes), SQLite WAL tuning, graceful shutdown de threads, cloud upload deduplicado, VisualComparatorPlayer split-screen para comparar original vs processado.',
  },
  {
    version: '0.29.0-alpha.1',
    description:
      'v0.29.0-alpha.1: Alpha Instrumentada â€” Watch Folders, Onboarding Wizard, Telemetria local opt-in, Bug Report integrado, mapeamento automÃ¡tico de erros do pipeline, keychain OS para credenciais cloud.',
  },
  {
    version: '0.28.0',
    description:
      'v0.28.0: Platform-Adaptive UX â€” design tokens CSS por plataforma (Windows/macOS/Linux), WindowControls.tsx (botÃµes min/max/close Fluent), efeitos Mica (Windows 11) e Vibrancy (macOS), scrollbars nativas.',
  },
  {
    version: '0.27.0',
    description:
      'v0.27.0: SeguranÃ§a cloud â€” credenciais armazenadas no OS keychain (Windows Credential Manager / macOS Keychain / Linux Secret Service), fix path traversal SMB, auditoria de seguranÃ§a completa.',
  },
  {
    version: '0.26.0',
    description:
      'v0.26.0: CI/CD release pipeline, sync automÃ¡tico CHANGELOG + SYNC-STATE, check-translations gate, builds assinados Windows/macOS.',
  },
  {
    version: '0.25.0',
    description:
      'v0.25.0: Cloud File Browser â€” navegar, descarregar e apagar ficheiros em FTP/SFTP/SMB/S3/GDrive directamente nas definiÃ§Ãµes; cloud upload para destinos agora accionado automaticamente apÃ³s processamento; GDrive upsert (PATCH se ficheiro jÃ¡ existe); correcÃ§Ãµes GDrive Browse (base_path â†’ folder ID, raiz My Drive).',
  },
  {
    version: '0.24.0',
    description:
      'v0.24.0: sistema de logging completo (ficheiros rotativos, verbosidade, aba Logs nas Settings, envio ao developer); settings aplicam ao vivo (idioma e concorrÃªncia); cache display na aba System; GDrive OAuth melhorado (URL clicÃ¡vel + cÃ³digo copiÃ¡vel); CloudDestinationPicker no BatchSubmitModal; MinIO local isolado para desenvolvimento.',
  },
  {
    version: '0.23.0',
    description:
      'v0.23.0: navegaÃ§Ã£o in-app para ficheiros processados, popup de reprocessamento em foreground (portal), Pipeline Summary clicÃ¡vel com painel expansÃ­vel, delete e factory reset com autorizaÃ§Ã£o explÃ­cita de ficheiros, 6 novas chaves i18n.',
  },
  {
    version: '0.22.0',
    description:
      'v0.22.0: MediaInfo com tabs horizontais, caminhos original/processado visÃ­veis, reprocessar com selector de perfil, botÃµes explorador separados (original/processado), download de ficheiro processado, fila com navegaÃ§Ã£o para asset, dashboard scrollÃ¡vel, registo de actividade, 16 novas chaves i18n, manual do utilizador.',
  },
  {
    version: '0.21.0',
    description:
      'v0.21.0: sidecar reconstruÃ­do com todos os fixes activos, max_concurrent_jobs funcional, output_dir migrado automaticamente de temp para Videos/Nexora Output, filenames nos jobs da fila, log de acÃ§Ãµes, feedback de retry/cancel.',
  },
  {
    version: '0.20.0',
    description:
      'v0.20.0: output_dir padrÃ£o para Videos/Nexora Output, MediaInfo original vs processado com toggle, caminho do ficheiro visÃ­vel no player, SHA-256 e TAGS no Copy All, limpeza GitHub, Videos_Tests incluÃ­dos.',
  },
  {
    version: '0.19.0',
    description:
      'v0.19.0: suporte H.265/HEVC e VP9, BatchSubmitModal com estimativas, thumbnails automÃ¡ticos, player inline na Biblioteca, MediaInfo detalhado no Detalhe de Asset, correcÃ§Ãµes VMAF Windows, navegaÃ§Ã£o de detalhes clicÃ¡vel.',
  },
  {
    version: '0.18.0',
    description:
      'Auditoria v0.18.0: drag-drop corrigido, sidecar stateless, CSP estrita, least-privilege, ESLint+Prettier, Husky, testes de componentes, recharts, Radix Dialog, sonner, tauri-plugin-store, telemetria opt-in.',
  },
  {
    version: '0.17.0',
    description:
      'EstabilizaÃ§Ã£o e documentaÃ§Ã£o: README completo, manual do utilizador, guia de ecrÃ£s, HelpOverlay integrado.',
  },
  {
    version: '0.16.0',
    description:
      'UI/UX overhaul completo: TopBar com mÃ©tricas circulares, definiÃ§Ãµes por tabs (Geral, Interface, Sistema, AvanÃ§ado, Sobre), pipeline de 8 fases com resumo visual, aprovaÃ§Ã£o de quarentena, VMAF activo, perfis com dropdown, tema e idioma.',
  },
  {
    version: '0.15.0',
    description:
      'Pipeline de quarentena QC prÃ©/pÃ³s, estados qc_quarantined e qc_rejected, aprovaÃ§Ã£o manual de jobs, VMAF scoring com libvmaf.',
  },
  {
    version: '0.14.0',
    description:
      'Workers FFmpeg bundled, GPU auto-detect (NVENC/AMF/QSV), sidecar Node.js estÃ¡vel, logs estruturados, fila em memÃ³ria + SQLite.',
  },
  {
    version: '0.13.0',
    description:
      'Factory reset, system tray, schema SQLite completo, deep links nexora://, auto-updater Tauri built-in.',
  },
  {
    version: '0.12.0',
    description:
      'Frontend React 19 + Zustand + Tailwind v4, drag-and-drop nativo Tauri, notificaÃ§Ãµes do SO.',
  },
  {
    version: '0.11.0',
    description: 'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description: 'ProtÃ³tipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
