# Nexora QA Runner — Guia de Uso

## Para que serve

O Nexora QA Runner ajuda a verificar se o Nexora Desktop esta pronto para uso ou release. Ele executa testes automaticos, recolhe logs, mede tempos e cria relatorios que podem ser entregues a uma IA ou programador.

## Como usar sem comandos tecnicos

Abra a pasta `qa-runner/` e escolha o seu sistema:

- Windows: `qa-runner/windows/`
- macOS: `qa-runner/macos/`
- Linux: `qa-runner/linux/`

Depois execute um dos ficheiros:

- `Executar-Teste-Rapido`
- `Executar-Teste-Completo`
- `Executar-Teste-Com-Video`
- `Executar-Teste-Stress-Leve`
- `Executar-Teste-Stress-Forte`
- `Abrir-Ultimo-Relatorio`

## Que teste escolher

| Teste        | Quando usar                                                               |
| ------------ | ------------------------------------------------------------------------- |
| Rapido       | Antes de continuar trabalho ou confirmar que nada essencial partiu.       |
| Completo     | Antes de commit/release ou depois de alteracoes grandes.                  |
| Com Video    | Quando quer validar ingestao/copia segura de videos de teste.             |
| Stress Leve  | Quando quer medir estabilidade basica sem pesar no computador.            |
| Stress Forte | Apenas quando quer descobrir limites e aceita consumo maior de CPU/disco. |

## Onde ficam os resultados

Os resultados ficam em:

```text
.logs/qa-runs/<data-hora>/
```

O ficheiro principal e:

```text
index.html
```

Ele abre automaticamente no final quando o sistema permitir.

## O que enviar para uma IA

Para pedir correcao a uma IA, envie:

```text
ai-handoff.md
report.json
logs/test-run.log
```

Se existir falha visual, envie tambem a pasta `screenshots/`.

## Seguranca dos videos

O runner nao altera videos originais. Ele copia os ficheiros para uma pasta temporaria da propria execucao e trabalha sempre sobre a copia.

## Se algo falhar

Abra `index.html` e veja:

- estado geral;
- passos com erro;
- esperado vs obtido;
- logs associados;
- sugestao de area provavel.

Se a aplicacao nao estiver aberta ou nao for encontrada, o runner gera aviso em vez de apagar ou modificar dados.
