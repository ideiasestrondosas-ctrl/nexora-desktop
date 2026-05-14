/**
 * Versão única da aplicação Nexora Desktop.
 * Actualizar aqui em cada release — propaga automaticamente
 * para todos os sítios que mostram a versão.
 */
export const APP_VERSION = '0.16.0';

export interface VersionEntry {
  version: string;
  description: string;
}

export const VERSION_HISTORY: VersionEntry[] = [
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
    description:
      'Tauri 2.x setup, IPC commands, CI/CD GitHub Actions, builds Windows/macOS/Linux.',
  },
  {
    version: '0.10.0',
    description:
      'Protótipo inicial: shell Tauri, esqueleto React, estrutura de projecto desktop.',
  },
];
