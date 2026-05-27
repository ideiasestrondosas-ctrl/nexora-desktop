# Nexora QA Runner — Manual do Utilizador

Este runner testa o Nexora Desktop automaticamente e cria um relatorio facil de ler.

Nao precisa de saber programacao, comandos de desenvolvimento, npm, Rust ou Tauri.

## Como executar

Abra a pasta do seu sistema:

- Windows: `qa-runner/windows/`
- macOS: `qa-runner/macos/`
- Linux: `qa-runner/linux/`

Depois clique duas vezes num destes ficheiros:

- **Executar-Teste-Rapido**: melhor para uma verificacao rapida.
- **Executar-Teste-Completo**: melhor antes de enviar uma versao.
- **Executar-Teste-Com-Video**: verifica a preparacao segura de videos de teste.
- **Executar-Teste-Stress-Leve**: mede estabilidade basica.
- **Executar-Teste-Stress-Forte**: cria mais carga e pode deixar o computador mais lento.
- **Abrir-Ultimo-Relatorio**: abre o relatorio mais recente.

## O que acontece durante o teste

Vai ver mensagens como:

```text
[1/8] A preparar ambiente QA isolado...
[2/8] A procurar videos de teste seguros...
[3/8] A verificar se Nexora Desktop esta a correr...
```

Cada passo explica o que esta a fazer. No final, o runner cria e tenta abrir o relatorio visual.

## Onde ficam os resultados

Os resultados ficam em:

```text
.logs/qa-runs/<data-hora>/
```

O ficheiro principal e:

```text
index.html
```

## Que ficheiros enviar para uma IA

Para pedir ajuda a uma IA, envie:

- `ai-handoff.md`
- `report.json`
- `logs/test-run.log`

Se houver imagens ou screenshots, envie tambem a pasta `screenshots/`.

## Videos de teste

O runner usa primeiro um video pequeno que ja existe no projeto:

```text
tests/fixtures/test-720p-5s.mp4
```

Se encontrar a pasta `Videos_Tests/`, tambem usa esses videos.

Os videos originais nunca sao alterados. O runner cria copias temporarias na pasta do relatorio.

## Isto mexe nos meus dados reais?

Nao. O runner cria uma area isolada para QA e nao apaga nem altera videos originais, base de dados real ou configuracoes reais.

## Se der erro

Abra `index.html` e veja:

- o passo que falhou;
- o que era esperado;
- o que aconteceu;
- que ficheiro de log consultar;
- que ficheiro entregar a uma IA.
