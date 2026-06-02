# Beta Testing Guide: Activação + Actualização v0.31.5 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar o separador "Guia Beta" no Manual de Ajuda para todos os utilizadores em produção e actualizar o conteúdo do BETA_TESTING_GUIDE (PT + EN) para v0.31.5-beta.1 com novos testes.

**Architecture:** Três ficheiros editados de forma cirúrgica. O HelpModal.tsx perde a condição DEV, o badge DEV ONLY, e passa a usar versão dinâmica via APP_VERSION. Os dois guias Markdown recebem: cabeçalho actualizado, "O que NÃO reportar" com 2 novos itens, T18-01 com contagem corrigida (11→12 separadores), 4 sub-testes novos em secções existentes (T02-05, T08-03, T14-03, T15-03), e nova secção T22 com 4 testes (v0.30.11–v0.31.5).

**Tech Stack:** React 19, TypeScript, `@/lib/version.APP_VERSION`, Markdown GFM, i18next

---

## Ficheiros

| Ficheiro                        | Operação                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/components/HelpModal.tsx`  | Modificar: import APP_VERSION, remover badge DEV ONLY, versão dinâmica, remover gate DEV                                   |
| `docs/BETA_TESTING_GUIDE.pt.md` | Modificar: cabeçalho, índice, limitações (+2 itens), T18-01 (11→12), rodapé; adicionar T02-05, T08-03, T14-03, T15-03, T22 |
| `docs/BETA_TESTING_GUIDE.en.md` | Modificar: mesmo âmbito em inglês                                                                                          |

---

## Task 1: HelpModal.tsx — Remover gate DEV, badge DEV ONLY, usar versão dinâmica

**Files:**

- Modify: `src/components/HelpModal.tsx`

- [ ] **Step 1: Adicionar import de APP_VERSION**

Em `src/components/HelpModal.tsx`, adicionar após a linha `import { logActivity } from '@/lib/activityLog';`:

```tsx
import { APP_VERSION } from '@/lib/version';
```

- [ ] **Step 2: Remover badge DEV ONLY e usar versão dinâmica em BetaGuidePanel**

Localizar o `<div className="flex items-center gap-2">` dentro de `BetaGuidePanel` (contém o span "DEV ONLY" e o span com versão hardcoded).

**Antes:**

```tsx
<div className="flex items-center gap-2">
  <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
    DEV ONLY
  </span>
  <span className="text-[11px] text-text-muted">
    {isPt ? 'Guia de Testes Beta — v0.30.0-beta.1' : 'Beta Testing Guide — v0.30.0-beta.1'}
  </span>
</div>
```

**Depois:**

```tsx
<div className="flex items-center gap-2">
  <span className="text-[11px] text-text-muted">
    {isPt ? `Guia de Testes Beta — v${APP_VERSION}` : `Beta Testing Guide — v${APP_VERSION}`}
  </span>
</div>
```

- [ ] **Step 3: Remover gate DEV na lista de tabs visíveis**

Em `HelpOverlay`, localizar a linha `const visibleTabs`.

**Antes:**

```tsx
const visibleTabs = import.meta.env.DEV ? [...SCREEN_TABS, ...DEV_TABS] : SCREEN_TABS;
```

**Depois:**

```tsx
const visibleTabs = [...SCREEN_TABS, ...DEV_TABS];
```

- [ ] **Step 4: Verificar tipos**

```powershell
npm run type-check
```

Esperado: sem erros. Se aparecer erro sobre `APP_VERSION`, confirmar que o import em Step 1 ficou na posição correcta.

- [ ] **Step 5: Commit**

```bash
git add src/components/HelpModal.tsx
git commit -m "feat(help): activar separador Guia Beta em produção + versão dinâmica"
```

---

## Task 2: BETA_TESTING_GUIDE.pt.md — Cabeçalho, índice, limitações, T18-01, rodapé

**Files:**

- Modify: `docs/BETA_TESTING_GUIDE.pt.md`

- [ ] **Step 1: Actualizar cabeçalho (versão + data)**

**Antes (linhas 3–4):**

```markdown
**Versão:** v0.30.0-beta.1  
**Data:** Maio 2026
```

**Depois:**

```markdown
**Versão:** v0.31.5-beta.1  
**Data:** Junho 2026
```

- [ ] **Step 2: Actualizar índice — adicionar entrada T22**

**Antes:**

```markdown
- [T21 — Idiomas](#t21--idiomas)
```

**Depois:**

```markdown
- [T21 — Idiomas](#t21--idiomas)
- [T22 — Funcionalidades desde v0.30.11](#t22--funcionalidades-introduzidas-desde-v03011)
```

- [ ] **Step 3: Adicionar 2 itens à secção "O que NÃO reportar"**

**Antes (bloco completo dos bullets):**

```markdown
- A actualização automática mostra erro — normal em versões de teste
- O iCloud Drive aparece mas não funciona — não está suportado nesta versão
- Versões para macOS e Linux não estão disponíveis nesta beta
- O Google Drive e Dropbox precisam de configuração OAuth — erro de credenciais é esperado se não configurares
- Há um atraso de 3 segundos nas Pastas Monitorizadas antes de detectar ficheiros novos — é intencional
```

**Depois:**

```markdown
- A actualização automática mostra erro — normal em versões de teste
- O iCloud Drive aparece mas não funciona — não está suportado nesta versão
- Versões para macOS e Linux não estão disponíveis nesta beta
- O Google Drive e Dropbox precisam de configuração OAuth — erro de credenciais é esperado se não configurares
- Há um atraso de 3 segundos nas Pastas Monitorizadas antes de detectar ficheiros novos — é intencional
- O VMAF pode demorar 2–3× o tempo do vídeo em ficheiros com mais de 10 minutos — é normal
- O botão "Criar atalho no desktop" só aparece em Windows (macOS e Linux: o botão não está visível)
```

- [ ] **Step 4: Actualizar T18-01 — contagem de separadores (11 → 12)**

**Antes:**

```markdown
- O menu lateral tem 11 separadores (Introdução, Dashboard, Biblioteca, Detalhe, Importar, Fila, Perfis, Definições, Cloud, Comparador, Logs).
```

**Depois:**

```markdown
- O menu lateral tem 12 separadores (Introdução, Dashboard, Biblioteca, Detalhe, Importar, Fila, Perfis, Definições, Cloud, Comparador, Logs, Guia Beta).
```

- [ ] **Step 5: Actualizar rodapé**

**Antes (perto do final do ficheiro):**

```markdown
**Versão testada:** v0.30.0-beta.1  
**Última actualização deste guia:** Maio 2026
```

**Depois:**

```markdown
**Versão testada:** v0.31.5-beta.1  
**Última actualização deste guia:** Junho 2026
```

- [ ] **Step 6: Verificar**

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.pt.md" -Pattern "v0.31.5-beta.1" | Measure-Object -Line
```

Esperado: `Lines: 3` (cabeçalho + rodapé × 2).

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.pt.md" -Pattern "12 separadores"
```

Esperado: 1 linha encontrada.

- [ ] **Step 7: Commit**

```bash
git add docs/BETA_TESTING_GUIDE.pt.md
git commit -m "docs(beta-guide-pt): cabeçalho v0.31.5, T18-01 12 tabs, limitações +2"
```

---

## Task 3: BETA_TESTING_GUIDE.pt.md — Sub-testes T02-05, T08-03, T14-03, T15-03

**Files:**

- Modify: `docs/BETA_TESTING_GUIDE.pt.md`

- [ ] **Step 1: Adicionar T02-05 (após T02-04, antes de T03)**

Localizar o final de T02-04, que termina com:

```markdown
**Se não funcionar:** Reporta com título "Trabalhos recentes não aparecem no Dashboard".

---

### T03 — Biblioteca
```

Substituir por:

```markdown
**Se não funcionar:** Reporta com título "Trabalhos recentes não aparecem no Dashboard".

---

#### T02-05 — QueuePill: Indicador de Fila em Tempo Real

**Precisas de:** Um trabalho em processamento (T04-01 passou).

**Passos:**

1. Com um trabalho a processar, observa a **barra de topo** (a barra horizontal acima do conteúdo principal).
2. À direita das métricas circulares (CPU, RAM, GPU, Disco), procura uma pílula/badge pequena.

**O que deve acontecer:**

- Enquanto há trabalhos em curso: a pílula mostra um dot **azul pulsante** e texto como "1 em curso".
- Quando todos os trabalhos terminam: o dot fica cinzento e o texto muda para "Inactivo".
- Aparece um número verde com ✓ ao lado, indicando quantos trabalhos foram concluídos nesta sessão.

**Se não funcionar:** Reporta com título "QueuePill não aparece ou não actualiza na barra de topo".

---

### T03 — Biblioteca
```

- [ ] **Step 2: Adicionar T08-03 (após T08-02, antes de T09)**

Localizar o final de T08-02, que termina com:

```markdown
**Se não funcionar:** Reporta com título "Limpeza de cache de miniaturas falhou".

---

### T09 — Definições › Logs
```

Substituir por:

```markdown
**Se não funcionar:** Reporta com título "Limpeza de cache de miniaturas falhou".

---

#### T08-03 — Modal de Diagnóstico do Sistema

**Passos:**

1. Observa o ícone de **Definições** no menu da esquerda.
2. Se houver um ponto **amarelo** no canto do ícone, clica em Definições.
3. Verifica se aparece um banner de aviso no topo da página de Definições.
4. Se aparecer, clica em **Ver detalhes** (ou equivalente).

**O que deve acontecer:**

- Abre um modal com o estado de três componentes: **FFmpeg**, **FFprobe**, e **Engine**.
- Em instalação normal, os três devem aparecer com estado **verde** (OK).
- Se algum aparecer a vermelho, o modal indica o problema e sugere como resolver.

**Nota:** Em instalação correcta, o ponto amarelo não deve aparecer na sidebar. Reporta se aparecer sem motivo aparente com título "Badge de aviso em Definições sem motivo aparente".

---

### T09 — Definições › Logs
```

- [ ] **Step 3: Adicionar T14-03 (após T14-02, antes de T15)**

Localizar o final de T14-02, que termina com:

```markdown
- _Nota: Em versões de teste (beta), pode aparecer um aviso de "modo dev" — isso é normal._

---

### T15 — Detalhe de Ficheiro
```

Substituir por:

```markdown
- _Nota: Em versões de teste (beta), pode aparecer um aviso de "modo dev" — isso é normal._

---

#### T14-03 — Atalho no Desktop e Badge "Já Actualizado"

**Passos:**

1. Em Definições › Sobre, procura o botão **"Criar atalho no desktop"** (apenas visível em Windows).
2. Clica no botão.
3. Minimiza a app e verifica o Ambiente de Trabalho.
4. Volta à app e clica em **"Verificar Actualizações"** quando já tens a versão mais recente instalada.

**O que deve acontecer:**

- Um atalho do Nexora Desktop aparece no Ambiente de Trabalho do Windows.
- Ao verificar actualizações com a versão mais recente já instalada, aparece um badge **"Já actualizado ✓"** inline a verde, que desaparece automaticamente ao fim de cerca de 6 segundos.

**Se não funcionar:** Reporta com título "Botão 'Criar atalho no desktop' não funciona" ou "Badge 'já actualizado' não aparece".

---

### T15 — Detalhe de Ficheiro
```

- [ ] **Step 4: Adicionar T15-03 (após T15-02, antes de T16)**

Localizar o final de T15-02, que termina com:

```markdown
- A página de detalhe mostra o novo trabalho no histórico com estado "Em fila" ou "A processar".

---

### T16 — Comparador Visual
```

Substituir por:

```markdown
- A página de detalhe mostra o novo trabalho no histórico com estado "Em fila" ou "A processar".

---

#### T15-03 — Página de Detalhe Actualiza em Tempo Real

**Precisas de:** Um ficheiro importado com um trabalho recentemente submetido (T04-01 passou).

**Passos:**

1. Abre a página de detalhe de um ficheiro que acabaste de submeter para processamento (T15-01).
2. Permanece nessa página sem navegar para outro ecrã.
3. Aguarda que o processamento avance.

**O que deve acontecer:**

- O estado do trabalho no histórico muda de **"Em fila"** → **"A processar"** → **"Concluído"** sem precisares de recarregar a página ou navegar.
- Quando o trabalho termina, o score **VMAF**, o codec de output e o caminho do ficheiro processado aparecem automaticamente na página.
- Não precisas de voltar à Biblioteca e reabrir o ficheiro para ver os resultados actualizados.

**Se não funcionar:** Reporta com título "Detalhe de ficheiro não actualiza em tempo real durante processamento".

---

### T16 — Comparador Visual
```

- [ ] **Step 5: Verificar sub-testes**

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.pt.md" -Pattern "T02-05|T08-03|T14-03|T15-03"
```

Esperado: 4 linhas (uma por cada sub-teste).

- [ ] **Step 6: Commit**

```bash
git add docs/BETA_TESTING_GUIDE.pt.md
git commit -m "docs(beta-guide-pt): adicionar sub-testes T02-05, T08-03, T14-03, T15-03"
```

---

## Task 4: BETA_TESTING_GUIDE.pt.md — Nova secção T22

**Files:**

- Modify: `docs/BETA_TESTING_GUIDE.pt.md`

- [ ] **Step 1: Adicionar secção T22 (antes de "## 5. Glossário")**

Localizar:

```markdown
## 5. Glossário
```

Substituir por:

```markdown
### T22 — Funcionalidades Introduzidas desde v0.30.11

> **Nota:** Esta secção testa funcionalidades adicionadas nas versões v0.30.11 a v0.31.5. São complementares aos testes anteriores — se já fizeste T02 a T21, estes testes focam-se nos detalhes específicos das novas versões.

---

#### T22-01 — QueuePill: Comportamento em Todos os Estados

> **Objectivo:** Verificar todos os estados do indicador de fila na barra de topo.

**Passos:**

1. Com a app sem trabalhos em curso, observa a barra de topo.
2. Submete um trabalho (ver T04-01).
3. Observa a pílula durante o processamento.
4. Aguarda que o trabalho conclua.
5. Submete mais um trabalho e cancela-o imediatamente (ver T04-03).

**O que deve acontecer:**

- Estado **inactivo** (sem trabalhos): pílula cinzenta com texto "Inactivo", sem número de trabalhos.
- Estado **activo** (a processar): dot azul pulsante, número de trabalhos em curso visível.
- Estado **com concluídos**: número verde com ✓ aparece e acumula a cada trabalho terminado.
- Trabalho **cancelado** não incrementa o contador verde de concluídos.

**Se não funcionar:** Reporta com título "QueuePill — comportamento incorrecto em estado [X]".

---

#### T22-02 — AssetDetailPage: Actualização Reactiva Completa

> **Objectivo:** Confirmar todos os campos que actualizam em tempo real durante o processamento.

**Precisas de:** Um ficheiro importado na Biblioteca.

**Passos:**

1. Abre a página de detalhe de um ficheiro (T15-01).
2. Clica em **Processar** e selecciona o perfil **web-hd**.
3. Permanece na página de detalhe sem navegar.
4. Observa os seguintes campos durante e após o processamento:
   - Estado do trabalho na secção de histórico
   - Score VMAF (aparece após conclusão)
   - Codec e resolução do ficheiro de saída
   - Caminho do ficheiro processado

**O que deve acontecer:**

- Todos os campos acima actualizam sem recarregar a página ou navegar para outro ecrã.
- O VMAF aparece com a pontuação e a cor correspondente (verde ≥ 85, amarelo 70–84, vermelho < 70).

**Se não funcionar:** Reporta com título "AssetDetailPage — campo [X] não actualiza em tempo real".

---

#### T22-03 — Estados QC: Quarentena e Rejeição

> **Objectivo:** Verificar os estados específicos de controlo de qualidade no histórico da Fila.

> _Este teste pode não ocorrer com todos os ficheiros — a quarentena acontece quando a app detecta um possível problema de qualidade. Podes tentar com vídeos de baixa qualidade ou muito comprimidos._

**Se vires a secção "QUARENTENA" na Fila:**

**Passos:**

1. Na Fila, observa a secção de quarentena (fundo laranja/amarelo).
2. Clica no ícone de **polegar para baixo** (rejeitar) junto a um ficheiro em quarentena.
3. Verifica o estado final do ficheiro no histórico de trabalhos.

**O que deve acontecer:**

- Após rejeitar: o estado muda para **"Rejeitado"** (vermelho) no histórico.
- O ficheiro rejeitado não volta a "Concluído" nem a "Em fila".
- O estado persiste após navegar para outro ecrã e regressar à Fila.

**Se não funcionar:** Reporta com título "Estado 'Rejeitado' não aparece correctamente no histórico".

---

#### T22-04 — Nome do Ficheiro Visível na Fila

> **Objectivo:** Confirmar que o nome do ficheiro aparece correctamente durante o processamento.

**Passos:**

1. Submete um trabalho (T04-01).
2. Navega imediatamente para **Fila**.
3. Observa o trabalho na secção "Em Processamento".

**O que deve acontecer:**

- O **nome do ficheiro** (ex: `video_teste.mp4`) aparece visivelmente junto ao perfil seleccionado e à barra de progresso.
- Não aparece um ID genérico (ex: um UUID como `a3f8b2c1-...`) nem um campo em branco.

**Se não funcionar:** Reporta com título "Nome do ficheiro não aparece na Fila durante processamento".

---

## 5. Glossário
```

- [ ] **Step 2: Verificar T22**

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.pt.md" -Pattern "T22-0[1-4]"
```

Esperado: 4 linhas encontradas.

- [ ] **Step 3: Commit**

```bash
git add docs/BETA_TESTING_GUIDE.pt.md
git commit -m "docs(beta-guide-pt): adicionar secção T22 — funcionalidades v0.30.11-v0.31.5"
```

---

## Task 5: BETA_TESTING_GUIDE.en.md — Todas as alterações (EN)

**Files:**

- Modify: `docs/BETA_TESTING_GUIDE.en.md`

- [ ] **Step 1: Actualizar cabeçalho**

**Antes:**

```markdown
**Version:** v0.30.0-beta.1  
**Date:** May 2026
```

**Depois:**

```markdown
**Version:** v0.31.5-beta.1  
**Date:** June 2026
```

- [ ] **Step 2: Actualizar índice — adicionar T22**

**Antes:**

```markdown
- [T21 — Languages](#t21--languages)
```

**Depois:**

```markdown
- [T21 — Languages](#t21--languages)
- [T22 — Features Since v0.30.11](#t22--features-introduced-since-v03011)
```

- [ ] **Step 3: Adicionar 2 itens à secção "What NOT to Report"**

Localizar os 5 bullets existentes na secção "What NOT to Report" e substituir o bloco completo por:

```markdown
- Automatic updates show an error — normal in test versions
- iCloud Drive appears but doesn't work — not supported in this version
- macOS and Linux versions are not available in this beta
- Google Drive and Dropbox require OAuth configuration — a credentials error is expected if you haven't configured them
- There is a 3-second delay in Watch Folders before detecting new files — this is intentional
- VMAF scoring may take 2–3× the video duration for files longer than 10 minutes — this is expected
- The "Create desktop shortcut" button only appears on Windows (macOS and Linux: button not visible)
```

- [ ] **Step 4: Actualizar T18-01 — contagem de separadores**

**Antes:**

```markdown
- The side menu has 11 tabs (Introduction, Dashboard, Library, Asset Detail, Import, Queue, Profiles, Settings, Cloud, Comparator, Logs).
```

**Depois:**

```markdown
- The side menu has 12 tabs (Introduction, Dashboard, Library, Asset Detail, Import, Queue, Profiles, Settings, Cloud, Comparator, Logs, Beta Guide).
```

- [ ] **Step 5: Adicionar T02-05 (após T02-04, antes de T03)**

Localizar o final de T02-04 (termina com a descrição de "Recent Jobs") e o início de `### T03 — Library`. Inserir entre eles:

```markdown
**If it doesn't work:** Report with the title "Recent jobs do not appear on the Dashboard".

---

#### T02-05 — QueuePill: Real-Time Queue Indicator

**You need:** A job currently being processed (T04-01 passed).

**Steps:**

1. With a job processing, look at the **top bar** (the horizontal bar above the main content area).
2. To the right of the circular metrics (CPU, RAM, GPU, Disk), look for a small pill/badge.

**What should happen:**

- While jobs are in progress: the pill shows a **pulsing blue dot** and text like "1 in progress".
- When all jobs finish: the dot turns grey and the text changes to "Idle".
- A green number with ✓ appears alongside, showing how many jobs have completed in this session.

**If it doesn't work:** Report with the title "QueuePill does not appear or does not update in the top bar".

---

### T03 — Library
```

- [ ] **Step 6: Adicionar T08-03 (após T08-02, antes de T09)**

Localizar o final de T08-02 (limpeza de cache de miniaturas) e o início de `### T09`. Inserir:

```markdown
**If it doesn't work:** Report with the title "Thumbnail cache clearing failed".

---

#### T08-03 — System Diagnostics Modal

**Steps:**

1. Look at the **Settings** icon in the left menu.
2. If there is a **yellow dot** in the corner of the icon, click on Settings.
3. Check if a warning banner appears at the top of the Settings page.
4. If it appears, click **View details** (or equivalent).

**What should happen:**

- A modal opens showing the status of three components: **FFmpeg**, **FFprobe**, and **Engine**.
- In a normal installation, all three should show **green** status (OK).
- If any appears red, the modal indicates the problem and suggests how to fix it.

**Note:** In a correct installation, the yellow dot should not appear in the sidebar. Report it if it appears without an obvious reason with the title "Warning badge in Settings with no apparent reason".

---

### T09 — Settings › Logs
```

- [ ] **Step 7: Adicionar T14-03 (após T14-02, antes de T15)**

Localizar o final de T14-02 (nota sobre "dev mode") e o início de `### T15`. Inserir:

```markdown
- _Note: In test versions (beta), a "dev mode" warning may appear — that is normal._

---

#### T14-03 — Desktop Shortcut and "Already Up To Date" Badge

**Steps:**

1. In Settings › About, look for the **"Create desktop shortcut"** button (only visible on Windows).
2. Click the button.
3. Minimise the app and check the Desktop.
4. Return to the app and click **"Check for Updates"** when you already have the latest version installed.

**What should happen:**

- A Nexora Desktop shortcut appears on the Windows Desktop.
- When checking for updates with the latest version already installed, an **"Already up to date ✓"** inline badge appears in green and automatically disappears after approximately 6 seconds.

**If it doesn't work:** Report with the title "Create desktop shortcut button doesn't work" or "'Already up to date' badge doesn't appear".

---

### T15 — Asset Detail
```

- [ ] **Step 8: Adicionar T15-03 (após T15-02, antes de T16)**

Localizar o final de T15-02 (estado "Queued" ou "Processing") e o início de `### T16`. Inserir:

```markdown
- The detail page shows the new job in history with the status "Queued" or "Processing".

---

#### T15-03 — Asset Detail Page Updates in Real Time

**You need:** An imported file with a recently submitted job (T04-01 passed).

**Steps:**

1. Open the detail page of a file you have just submitted for processing (T15-01).
2. Stay on this page without navigating to another screen.
3. Wait for the processing to progress.

**What should happen:**

- The job status in the history section changes from **"Queued"** → **"Processing"** → **"Completed"** without reloading the page or navigating.
- When the job finishes, the **VMAF** score, output codec, and the path of the processed file appear automatically on the page.
- You do not need to return to the Library and reopen the file to see the updated results.

**If it doesn't work:** Report with the title "Asset detail page does not update in real time during processing".

---

### T16 — Visual Comparator
```

- [ ] **Step 9: Adicionar secção T22 (antes de "## 5. Glossary")**

Localizar `## 5. Glossary` e substituir por:

```markdown
### T22 — Features Introduced Since v0.30.11

> **Note:** This section tests features added in versions v0.30.11 to v0.31.5. They complement the previous tests — if you have already done T02 to T21, these tests focus on the specific details of the new versions.

---

#### T22-01 — QueuePill: Behaviour in All States

> **Objective:** Test all states of the queue indicator in the top bar.

**Steps:**

1. With the app and no jobs in progress, observe the top bar.
2. Submit a job (see T04-01).
3. Observe the pill during processing.
4. Wait for the job to complete.
5. Submit another job and cancel it immediately (see T04-03).

**What should happen:**

- **Idle** state (no jobs): grey pill with "Idle" text, no job count.
- **Active** state (processing): pulsing blue dot, number of in-progress jobs visible.
- **With completed jobs**: green number with ✓ appears and increments with each finished job.
- A **cancelled** job does not increment the green completed counter.

**If it doesn't work:** Report with the title "QueuePill — incorrect behaviour in state [X]".

---

#### T22-02 — AssetDetailPage: Complete Reactive Update

> **Objective:** Confirm all fields that update in real time during processing.

**You need:** An imported file in the Library.

**Steps:**

1. Open the detail page of a file (T15-01).
2. Click **Process** and select the **web-hd** profile.
3. Stay on the detail page without navigating.
4. Observe the following fields during and after processing:
   - Job status in the history section
   - VMAF score (appears after completion)
   - Codec and resolution of the output file
   - Path of the processed file

**What should happen:**

- All of the above fields update without reloading the page or navigating to another screen.
- The VMAF appears with the score and the corresponding colour (green ≥ 85, yellow 70–84, red < 70).

**If it doesn't work:** Report with the title "AssetDetailPage — field [X] does not update in real time".

---

#### T22-03 — QC States: Quarantine and Rejection

> **Objective:** Verify the specific quality control states in the Queue history.

> _This test may not occur with every file — quarantine happens when the app detects a potential quality issue. You can try with low-quality or heavily compressed videos._

**If you see a "QUARANTINE" section in the Queue:**

**Steps:**

1. In the Queue, observe the quarantine section (orange/yellow background).
2. Click the **thumbs down** icon (reject) next to a quarantined file.
3. Check the final status of the file in the job history.

**What should happen:**

- After rejecting: the status changes to **"Rejected"** (red) in the history.
- The rejected file does not return to "Completed" or "Queued".
- The status persists after navigating to another screen and returning to the Queue.

**If it doesn't work:** Report with the title "'Rejected' status does not appear correctly in history".

---

#### T22-04 — Filename Visible in Queue

> **Objective:** Confirm that the filename appears correctly during processing.

**Steps:**

1. Submit a job (T04-01).
2. Navigate immediately to **Queue**.
3. Observe the job in the "Processing" section.

**What should happen:**

- The **filename** (e.g. `test_video.mp4`) is clearly visible next to the selected profile and the progress bar.
- A generic ID (e.g. a UUID like `a3f8b2c1-...`) or a blank field does not appear.

**If it doesn't work:** Report with the title "Filename does not appear in Queue during processing".

---

## 5. Glossary
```

- [ ] **Step 10: Actualizar rodapé**

**Antes:**

```markdown
**Version tested:** v0.30.0-beta.1  
**Last updated:** May 2026
```

**Depois:**

```markdown
**Version tested:** v0.31.5-beta.1  
**Last updated:** June 2026
```

- [ ] **Step 11: Verificar**

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.en.md" -Pattern "v0.31.5-beta.1" | Measure-Object -Line
```

Esperado: `Lines: 3`.

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.en.md" -Pattern "T22-0[1-4]"
```

Esperado: 4 linhas.

```powershell
Select-String -Path "docs/BETA_TESTING_GUIDE.en.md" -Pattern "12 tabs"
```

Esperado: 1 linha.

- [ ] **Step 12: Commit**

```bash
git add docs/BETA_TESTING_GUIDE.en.md
git commit -m "docs(beta-guide-en): actualização completa EN v0.31.5 + T22 + sub-testes"
```

---

## Self-Review

**Spec coverage:**

| Requisito                        | Task              | ✓   |
| -------------------------------- | ----------------- | --- |
| Gate DEV removido                | Task 1, Step 3    | ✓   |
| Badge DEV ONLY removido          | Task 1, Step 2    | ✓   |
| Versão dinâmica APP_VERSION      | Task 1, Steps 1–2 | ✓   |
| Cabeçalho PT v0.31.5 + Junho     | Task 2, Step 1    | ✓   |
| Cabeçalho EN v0.31.5 + June      | Task 5, Step 1    | ✓   |
| Índice PT + T22                  | Task 2, Step 2    | ✓   |
| Índice EN + T22                  | Task 5, Step 2    | ✓   |
| "O que NÃO reportar" PT +2 itens | Task 2, Step 3    | ✓   |
| "What NOT to Report" EN +2 itens | Task 5, Step 3    | ✓   |
| T18-01 PT 11→12 separadores      | Task 2, Step 4    | ✓   |
| T18-01 EN 11→12 tabs             | Task 5, Step 4    | ✓   |
| T02-05 PT                        | Task 3, Step 1    | ✓   |
| T08-03 PT                        | Task 3, Step 2    | ✓   |
| T14-03 PT                        | Task 3, Step 3    | ✓   |
| T15-03 PT                        | Task 3, Step 4    | ✓   |
| T22 PT (4 testes)                | Task 4, Step 1    | ✓   |
| T02-05 EN                        | Task 5, Step 5    | ✓   |
| T08-03 EN                        | Task 5, Step 6    | ✓   |
| T14-03 EN                        | Task 5, Step 7    | ✓   |
| T15-03 EN                        | Task 5, Step 8    | ✓   |
| T22 EN (4 testes)                | Task 5, Step 9    | ✓   |
| Rodapé PT                        | Task 2, Step 5    | ✓   |
| Rodapé EN                        | Task 5, Step 10   | ✓   |

**Gap identificado e corrigido:** T18-01 (11→12 tabs) não estava no spec original — adicionado às Tasks 2 e 5.

**Placeholder scan:** Sem TBDs. Todo o conteúdo dos testes é completo com passos, resultados esperados e títulos de reporte.

**Type consistency:** `APP_VERSION` importado de `@/lib/version` — mesmo path que `App.tsx`. Utilizado como template literal em JSX.
