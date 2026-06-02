# Design Spec — Beta Testing Guide: Actualização v0.31.5 + Activação no Manual

**Data:** 2026-06-02  
**Estado:** Aprovado  
**Sessão:** 60

---

## Contexto

O `BETA_TESTING_GUIDE` (PT e EN) foi criado na v0.30.0-beta.1. Desde então, a app evoluiu para v0.31.5-beta.1 com novas funcionalidades visíveis para o utilizador. O separador "Guia Beta" no Manual de Ajuda (HelpModal) existe mas está escondido em produção (`import.meta.env.DEV`). O objectivo é: (1) activar o separador para todos os utilizadores, (2) actualizar o guia com as mudanças desde v0.30.0.

---

## Âmbito

### Ficheiros a alterar

| Ficheiro                        | Tipo de alteração                                 |
| ------------------------------- | ------------------------------------------------- |
| `src/components/HelpModal.tsx`  | Remover gate DEV, badge DEV ONLY, versão dinâmica |
| `docs/BETA_TESTING_GUIDE.pt.md` | Actualização completa de conteúdo                 |
| `docs/BETA_TESTING_GUIDE.en.md` | Actualização completa de conteúdo (EN)            |

---

## Parte 1 — Código: HelpModal.tsx

### 1.1 Tornar betaGuide sempre visível

**Linha 324 — antes:**

```ts
const visibleTabs = import.meta.env.DEV ? [...SCREEN_TABS, ...DEV_TABS] : SCREEN_TABS;
```

**Depois:**

```ts
const visibleTabs = [...SCREEN_TABS, ...DEV_TABS];
```

### 1.2 Remover badge "DEV ONLY" em BetaGuidePanel

Remover o `<span>` com texto "DEV ONLY" (tag amber/brand no cabeçalho do painel).

### 1.3 Versão dinâmica

Importar `APP_VERSION` de `@/lib/version` e substituir o string hardcoded `v0.30.0-beta.1` por `v${APP_VERSION}`.

**Resultado visual do cabeçalho após alteração:**

```
[Guia de Testes Beta — v0.31.5-beta.1]    [Descarregar .md]
```

_(sem badge, versão actualiza automaticamente com cada release)_

---

## Parte 2 — Conteúdo: Guia de Testes Beta

### 2.1 Cabeçalho

| Campo  | Antes          | Depois         |
| ------ | -------------- | -------------- |
| Versão | v0.30.0-beta.1 | v0.31.5-beta.1 |
| Data   | Maio 2026      | Junho 2026     |

### 2.2 Secção "O que NÃO reportar" — Actualizações

**Remover (problemas já resolvidos):**

- Modais transparentes/invisíveis em Windows 10 e Linux sem Mica — resolvido em v0.30.11
- Nomes de fases do pipeline em formato de código (ex: `qc-pre`, `qc-post`) — resolvido em v0.30.11
- Nome do ficheiro não aparece na Fila durante processamento — resolvido em v0.31.5

**Manter (ainda válidos):**

- Actualização automática mostra erro — normal em versões de teste
- iCloud Drive aparece mas não funciona — não suportado nesta versão
- Versões para macOS e Linux não disponíveis nesta beta
- Google Drive e Dropbox precisam de configuração OAuth
- Atraso de 3 segundos nas Pastas Monitorizadas — intencional

**Adicionar (limitações novas):**

- VMAF pode demorar 2–3× o tempo do vídeo em ficheiros com mais de 10 minutos — é normal
- Botão "Criar atalho no desktop" só aparece em Windows (macOS e Linux: não visível)

### 2.3 Sub-testes novos em secções existentes

#### T02-05 — QueuePill: indicador de fila em tempo real

Adicionado à secção T02 (Dashboard).

**Objectivo:** Verificar o indicador de estado da fila na barra de topo.

**Precisas de:** Um trabalho em processamento (T04-01 passou).

**Passos:**

1. Com um trabalho a processar, observa a **barra de topo** (acima do conteúdo principal).
2. À direita das métricas circulares (CPU, RAM, GPU, Disco), procura uma pílula/badge pequena.

**O que deve acontecer:**

- Enquanto há trabalhos em curso: pílula com dot **azul pulsante** e texto "X em curso".
- Quando todos os trabalhos terminam: dot cinzento e texto "Inactivo".
- Número verde com ✓ aparece ao lado a indicar quantos trabalhos foram concluídos nesta sessão.

**Se não funcionar:** Reporta com título "QueuePill não aparece ou não actualiza na barra de topo".

---

#### T08-03 — Modal de Diagnóstico do Sistema

Adicionado à secção T08 (Definições › Sistema).

**Objectivo:** Verificar o modal de saúde dos componentes críticos da app.

**Passos:**

1. Observa o ícone de **Definições** no menu da esquerda.
2. Se houver um ponto **amarelo** no canto do ícone, clica em Definições.
3. Procura um banner de aviso no topo da página e clica em **Ver detalhes**.

**O que deve acontecer:**

- Abre um modal com o estado de três componentes: FFmpeg, FFprobe, Engine.
- Em instalação normal, os três devem aparecer com estado **verde** (OK).
- Se algum aparecer vermelho, o modal indica o problema e como resolver.

**Nota:** Em instalação correcta, o ponto amarelo não deve aparecer. Reporta se aparecer sem motivo aparente com título "Badge de aviso em Definições sem motivo".

---

#### T14-03 — Atalho no desktop e badge "já actualizado"

Adicionado à secção T14 (Definições › Sobre).

**Objectivo:** Verificar o botão de criar atalho e o feedback de versão actual.

**Passos:**

1. Em Definições › Sobre, procura o botão **"Criar atalho no desktop"** (apenas em Windows).
2. Clica no botão.
3. Minimiza a app e verifica o Ambiente de Trabalho.
4. De seguida, clica em **"Verificar Actualizações"** (quando já tens a versão mais recente).

**O que deve acontecer:**

- Um atalho do Nexora Desktop aparece no Ambiente de Trabalho.
- Ao clicar em "Verificar Actualizações" quando já tens a versão mais recente, aparece um badge **"Já actualizado ✓"** inline (verde), que desaparece automaticamente ao fim de ~6 segundos.

**Se não funcionar:** Reporta com título "Botão 'Criar atalho no desktop' não funciona" ou "Badge 'já actualizado' não aparece".

---

#### T15-03 — Página de detalhe actualiza em tempo real

Adicionado à secção T15 (Detalhe de Ficheiro).

**Objectivo:** Verificar que o detalhe de ficheiro se actualiza durante o processamento sem sair da página.

**Precisas de:** Um ficheiro importado e um trabalho submetido (T04-01 passou).

**Passos:**

1. Abre o detalhe de um ficheiro que acabaste de submeter para processamento.
2. Permanece nessa página sem navegar para outro ecrã.
3. Aguarda que o processamento progrida.

**O que deve acontecer:**

- O estado do trabalho muda de **"Em fila"** → **"A processar"** → **"Concluído"** sem recarregar a página.
- Quando o trabalho termina, o score **VMAF**, o codec de output, e o caminho do ficheiro processado aparecem automaticamente.
- Não precisas de voltar à Biblioteca e reabrir o ficheiro para ver os resultados.

**Se não funcionar:** Reporta com título "Detalhe de ficheiro não actualiza em tempo real".

---

### 2.4 Nova secção T22 — Funcionalidades v0.31.x

Secção nova adicionada após T21, antes do Glossário.

**Título:** `T22 — Funcionalidades Introduzidas desde v0.30.11`

**Nota introdutória:**

> Esta secção testa funcionalidades adicionadas nas versões v0.30.11 a v0.31.5. São complementares aos testes anteriores — se já fizeste T02 a T21, estes testes focam-se nos detalhes específicos das novas versões.

#### T22-01 — QueuePill: comportamento completo

**Objectivo:** Testar todos os estados do indicador de fila na barra de topo.

**Passos:**

1. Com a app sem trabalhos em curso, observa a barra de topo.
2. Submete um trabalho (T04-01).
3. Observa a pílula durante o processamento.
4. Aguarda que o trabalho termine.
5. Submete mais um trabalho e cancela-o (T04-03).

**O que deve acontecer:**

- Estado **inactivo**: pílula cinzenta, sem número de curso.
- Estado **activo**: dot azul pulsante, número de trabalhos em curso visível.
- Estado **concluído**: número verde com ✓ aparece e acumula com cada trabalho que termina.
- Trabalho cancelado não incrementa o contador verde.

---

#### T22-02 — AssetDetailPage: actualização reactiva completa

**Objectivo:** Confirmar todos os campos que actualizam em tempo real.

**Passos:**

1. Abre o detalhe de um ficheiro.
2. Submete um trabalho e fica na página.
3. Observa os seguintes campos durante e após o processamento:
   - Estado do trabalho no histórico
   - Score VMAF (aparece após conclusão)
   - Codec e resolução do ficheiro de saída
   - Caminho do ficheiro processado

**O que deve acontecer:**

- Todos os campos acima actualizam sem recarregar a página ou navegar.

---

#### T22-03 — Estados QC: quarentena e rejeição

**Objectivo:** Verificar os estados `qc_quarantined` e `qc_rejected` no histórico.

> _Este teste pode não ocorrer com todos os ficheiros — depende da qualidade do vídeo._

**Passos:**

1. Após um trabalho concluído, verifica o histórico em Fila.
2. Se houver um trabalho com estado **"Em Quarentena"** (fundo laranja/amarelo): clica no ícone de **rejeitar** (polegar para baixo).
3. Verifica o estado final no histórico.

**O que deve acontecer:**

- Após rejeitar: o estado muda para **"Rejeitado"** (vermelho) no histórico.
- O estado não volta a "Concluído" nem a "Em fila".

---

#### T22-04 — Nome do ficheiro visível na Fila

**Objectivo:** Confirmar que o nome do ficheiro aparece correctamente durante processamento.

**Passos:**

1. Submete um trabalho e navega para **Fila**.
2. Observa o trabalho na secção "Em Processamento".

**O que deve acontecer:**

- O **nome do ficheiro** (ex: `video_teste.mp4`) aparece junto ao perfil e à barra de progresso.
- Não aparece um ID genérico nem um campo vazio.

**Se não funcionar:** Reporta com título "Nome do ficheiro não aparece na Fila durante processamento".

---

## Critérios de Sucesso

- [ ] Separador "Guia de Testes Beta" visível no Manual de Ajuda em produção
- [ ] Badge "DEV ONLY" removido
- [ ] Versão no cabeçalho do painel é dinâmica (corresponde à versão da app instalada)
- [ ] Cabeçalho do guia mostra v0.31.5-beta.1 e Junho 2026
- [ ] Secção "O que NÃO reportar" actualizada (3 itens removidos, 2 adicionados)
- [ ] 4 sub-testes novos adicionados a T02, T08, T14, T15
- [ ] Secção T22 com 4 testes novos
- [ ] Versão PT e EN sincronizadas

---

## Fora de Âmbito

- Adicionar screenshots aos novos testes (ficam sem imagem — igual a outros testes existentes)
- Alterar a estrutura do componente `HelpModal` além das 3 linhas definidas
- Modificar os testes T01–T21 existentes além dos sub-testes adicionados
