# Nexora QA Runner — Especificacao do Subprojeto

## Objetivo

O Nexora QA Runner e um subprojeto isolado dentro do repositorio `nexora-desktop`. O objetivo e executar testes automaticos de verificacao funcional, video, carga e stress sem alterar o codigo funcional da aplicacao principal nem os dados reais do utilizador.

O runner gera evidencias para humanos e para agentes IA:

- relatorio visual HTML;
- relatorio Markdown;
- JSON estruturado;
- CSV de metricas;
- resumo `ai-handoff.md` pronto para entregar a uma IA.

## Localizacao e isolamento

O subprojeto vive em:

```text
qa-runner/
```

Relatorios de execucao vivem em:

```text
.logs/qa-runs/<timestamp>/
```

Regras:

- nao alterar `src/`, `src-tauri/`, `sidecar/` ou testes existentes;
- nao alterar dados reais da aplicacao;
- nao modificar videos originais;
- copiar videos para uma area temporaria QA antes de testar;
- o runner so fecha processos que ele proprio iniciou;
- o package principal do Nexora Desktop nao e alterado.

## Scripts para utilizadores

O utilizador nao precisa de comandos de desenvolvimento. Deve executar scripts por duplo clique:

```text
qa-runner/windows/*.bat
qa-runner/macos/*.command
qa-runner/linux/*.sh
```

Cada script mostra progresso constante:

```text
[1/8] A preparar ambiente QA...
[2/8] A procurar videos de teste...
[3/8] A verificar aplicacao...
[4/8] A executar testes...
[5/8] A recolher metricas...
[6/8] A gerar relatorios...
[7/8] A validar artefactos...
[8/8] Concluido.
```

## Entrada de videos

O runner escolhe videos de forma segura:

1. Usa `tests/fixtures/test-720p-5s.mp4` quando existir.
2. Procura `Videos_Tests/`.
3. Se o modo pedir videos externos, solicita uma pasta ao utilizador:
   - Windows: PowerShell/Windows Forms quando disponivel;
   - macOS: `osascript`;
   - Linux: `zenity` quando disponivel;
   - fallback: caminho textual.
4. Aceita `.mp4`, `.mov`, `.mxf`, `.avi`, `.mkv`, `.webm`, `.ts`, `.m2ts`.
5. Copia ficheiros para `.logs/qa-runs/<timestamp>/qa-input/`.

## Suites

| Suite          | Finalidade                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| `quick`        | Verifica estrutura, ambiente, app/processo se existir, fixture e relatorio. |
| `complete`     | Inclui verificacoes de documentacao, scripts, videos e estrutura QA.        |
| `video`        | Valida descoberta/copia de videos para area QA isolada.                     |
| `stress-light` | Cria 3 a 5 entradas temporarias e mede comportamento do runner.             |
| `stress-heavy` | Cria 20+ entradas temporarias; deve ser usado com cautela.                  |
| `soak`         | Executa ciclo prolongado configuravel para observar estabilidade.           |

## Deteccao da aplicacao

O runner tenta detectar se o Nexora Desktop esta a correr:

- Windows: lista de processos via PowerShell;
- macOS/Linux: `ps`;
- fallback: regista aviso, sem bloquear suites que nao exigem UI real.

Se uma app instalada/binario for encontrada no futuro, o runner pode iniciar em modo QA com `NEXORA_QA_MODE=1`. A primeira versao nao altera o codigo principal para suportar novos caminhos de dados; por isso os testes destrutivos reais ficam bloqueados ate existir suporte explicito na app.

## Relatorios

Cada execucao gera:

```text
index.html
report.md
report.json
ai-handoff.md
stats.json
metrics.csv
screenshots/
logs/
qa-input/
```

O HTML contem:

- resultado geral;
- suites e passos;
- tempos e estatisticas;
- avisos e falhas;
- caminhos dos artefactos;
- orientacao "o que fazer agora".

## Estatisticas

O runner calcula:

- total de testes;
- pass/fail/warning/skip;
- duracao total;
- media, minimo, maximo, p50, p90, p95;
- CPU/RAM quando disponivel;
- numero de videos encontrados/copias criadas;
- crescimento dos artefactos gerados;
- comparacao simples com run anterior quando existir.

## Criterios de aceitacao

- O subprojeto e criado em `qa-runner/`.
- Os scripts existem para Windows, macOS e Linux.
- O runner executa sem dependencias externas.
- O runner gera relatorio real local.
- Videos originais nao sao alterados.
- O README do GitHub menciona o subprojeto.
- `PROGRESS-DESKTOP.md`, `SYNC-STATE.md` e `.session-info.md` documentam a sessao.
