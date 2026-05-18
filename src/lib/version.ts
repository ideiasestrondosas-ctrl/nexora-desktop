/**
 * Versão única da aplicação Nexora Desktop.
 * Actualizar aqui em cada release — propaga automaticamente
 * para todos os sítios que mostram a versão.
 */
export const APP_VERSION = '0.22.0';

export interface VersionEntry {
  version: string;
  description: string;
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '0.22.0',
    description:
      'v0.22.0: MediaInfo com tabs horizontais, caminhos original/processado visíveis, reprocessar com selector de perfil, botões explorador separados (original/processado), download de ficheiro processado, fila com navegação para asset, dashboard scrollável, registo de actividade, 16 novas chaves i18n, manual do utilizador.',
  },
  {
    version: '0.21.0',
    description:
      'v0.21.0: sidecar reconstruído com todos os fixes activos, max_concurrent_jobs funcional, output_dir migrado automaticamente de temp para Videos/Nexora Output, filenames nos jobs da fila, log de acções, feedback de retry/cancel.',
  },
  {
    version: '0.20.0',
    description:
      'v0.20.0: output_dir padrão para Videos/Nexora Output, MediaInfo original vs processado com toggle, caminho do ficheiro visível no player, SHA-256 e TAGS no Copy All, limpeza GitHub, Videos_Tests incluídos.',
  },
  {
    version: '0.19.0',
    description:
      'v0.19.0: suporte H.265/HEVC e VP9, BatchSubmitModal com estimativas, thumbnails automáticos, player inline na Biblioteca, MediaInfo detalhado no Detalhe de Asset, correcções VMAF Windows, navegação de detalhes clicável.',
  },
  {
    version: '0.18.0',
    description:
      'Auditoria v0.18.0: drag-drop corrigido, sidecar stateless, CSP estrita, least-privilege, ESLint+Prettier, Husky, testes de componentes, recharts, Radix Dialog, sonner, tauri-plugin-store, telemetria opt-in.',
  },
  {
    version: '0.17.0',
    description:
      'Estabilização e documentação: README completo, manual do utilizador, guia de ecrãs, HelpOverlay integrado.',
  },
  {
    version: '0.16.0',
    description:
      'UI/UX overhaul completo: TopBar com métricas circulares, definições por tabs (Geral, Interface, Sistema, Avançado, Sobre), pipeline de 8 fases com resumo visual, aprovação de quarentena, VMAF activo, perfis com dropdown, tema e idioma.',
  },
  {
    version: '0.15.0',
    description:
      'Pipeline de quarentena QC pré/pós, estados qc_quarantined e qc_rejected, aprovação manual de jobs, VMAF scoring com libvmaf.',
  },
  {
    version: '0.14.0',
    description:
      'Workers FFmpeg bundled, GPU auto-detect (NVENC/AMF/QSV), sidecar Node.js estável, logs estruturados, fila em memória + SQLite.',
  },
  {
    version: '0.13.0',
    description:
      'Factory reset, system tray, schema SQLite completo, deep links nexora://, auto-updater Tauri built-in.',
  },
  {
    version: '0.12.0',
    description:
      'Frontend React 19 + Zustand + Tailwind v4, drag-and-drop nativo Tauri, notificações do SO.',
  },
  {
    version: '0.11.0',
    description: 'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description: 'Protótipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
