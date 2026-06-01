# Engine Binary Sync — Design

**Data:** 2026-06-01  
**Versão afectada:** v0.30.11-beta.1 (regressão recorrente desde Fase 22)

---

## Problema

O `nexora-engine.exe` em dev usa sempre a versão de `src-tauri/binaries/`, que nunca foi actualizada com a correção do Fase 22 (`pkg --no-bytecode --public`). Cada `cargo build` / `tauri dev` restaura o binário antigo (28 Mai, sem a flag), causando o erro:

```
A dynamic import callback was not specified.
```

O `sidecar/bin/nexora-engine.exe` (31 Mai, com a correção) nunca foi propagado para `src-tauri/binaries/`.

---

## Solução

3 alterações cirúrgicas. Sem novas dependências, sem mudanças de arquitectura.

### 1. Imediato — copiar binário corrigido

- `sidecar/bin/nexora-engine.exe` → `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe`
- `sidecar/bin/nexora-engine.exe` → `src-tauri/target/debug/nexora-engine.exe`

O Tauri copia automaticamente de `binaries/` → `target/debug/` em cada `cargo build`, por isso actualizar `binaries/` é suficiente para builds futuros.

### 2. `package.json` — auto-cópia após build

Adicionar passo de cópia ao final de cada script de build de engine:

- `engine:build:win` → copia para `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe`
- `engine:build:mac` → copia para `nexora-engine-aarch64-apple-darwin` e `nexora-engine-x86_64-apple-darwin`
- `engine:build:linux` → copia para `nexora-engine-x86_64-unknown-linux-gnu`
- `engine:build` (all) → todos os três acima

Usar `node -e "require('fs').copyFileSync(...)"` para portabilidade cross-shell.

### 3. `06-run-dev.ps1` — check em `nxVerifyEnvironment`

Após o check do sidecar CJS, adicionar verificação de sincronização do engine:

1. Se `sidecar/bin/nexora-engine.exe` não existir → skip (engine não foi compilado ainda)
2. Se `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe` não existir → copiar
3. Se `sidecar/bin/nexora-engine.exe` for mais recente que `src-tauri/binaries/` → copiar + warning

---

## Ficheiros alterados

| Ficheiro                                                      | Tipo de alteração                                  |
| ------------------------------------------------------------- | -------------------------------------------------- |
| `package.json`                                                | Adicionar cópia a `engine:build:win/mac/linux/all` |
| `scripts/06-run-dev.ps1`                                      | Adicionar sync check em `nxVerifyEnvironment`      |
| `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe` | Substituir com versão corrigida                    |
| `src-tauri/target/debug/nexora-engine.exe`                    | Substituir com versão corrigida (imediato)         |

---

## Fora de âmbito

- Mudar `-Sidecar` para também compilar o engine (scope creep)
- `sync.ps1` — não precisa de alterações
- CI/GitHub Actions — já usa os binários de `src-tauri/binaries/` correctamente
