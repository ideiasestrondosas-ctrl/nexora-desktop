# Engine Binary Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que `nexora-engine.exe` em `src-tauri/binaries/` está sempre sincronizado com `sidecar/bin/` após cada build, eliminando a regressão "A dynamic import callback was not specified".

**Architecture:** 3 alterações cirúrgicas independentes: (1) fix imediato ao binário local, (2) auto-cópia nos scripts `engine:build:*` do `package.json`, (3) check de sincronização em `nxVerifyEnvironment` no `06-run-dev.ps1`. Os binários são gitignored — as alterações commit-adas são apenas código de scripts.

**Tech Stack:** PowerShell, npm scripts (Node.js `fs.copyFileSync`)

---

## Ficheiros a alterar

| Ficheiro                                                      | Acção                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe` | Substituir com versão de 31 Mai (local only, gitignored)                     |
| `src-tauri/target/debug/nexora-engine.exe`                    | Substituir com versão de 31 Mai (local only, gitignored)                     |
| `package.json`                                                | Adicionar `node -e "fs.copyFileSync(...)"` no final de cada `engine:build:*` |
| `scripts/06-run-dev.ps1`                                      | Adicionar bloco de sync em `nxVerifyEnvironment`                             |

---

## Task 1: Immediate Fix — copiar binário corrigido

**Ficheiros:**

- Local: `src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe`
- Local: `src-tauri/target/debug/nexora-engine.exe`

- [ ] **Step 1: Verificar estado actual (deve mostrar datas diferentes)**

```powershell
$src  = Get-Item "sidecar\bin\nexora-engine.exe"
$dst1 = Get-Item "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
$dst2 = Get-Item "src-tauri\target\debug\nexora-engine.exe"
Write-Host "sidecar/bin:       $($src.LastWriteTime)  $($src.Length) bytes"
Write-Host "src-tauri/binaries: $($dst1.LastWriteTime)  $($dst1.Length) bytes"
Write-Host "target/debug:       $($dst2.LastWriteTime)  $($dst2.Length) bytes"
```

Resultado esperado: `sidecar/bin` com data 31/05/2026, os outros com 28/05/2026.

- [ ] **Step 2: Copiar binário corrigido para ambos os destinos**

```powershell
Copy-Item -LiteralPath "sidecar\bin\nexora-engine.exe" `
          -Destination "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe" -Force
Copy-Item -LiteralPath "sidecar\bin\nexora-engine.exe" `
          -Destination "src-tauri\target\debug\nexora-engine.exe" -Force
Write-Host "OK — engine sincronizado"
```

- [ ] **Step 3: Verificar que os 3 ficheiros têm agora a mesma data e tamanho**

```powershell
$src  = Get-Item "sidecar\bin\nexora-engine.exe"
$dst1 = Get-Item "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
$dst2 = Get-Item "src-tauri\target\debug\nexora-engine.exe"
Write-Host "sidecar/bin:       $($src.LastWriteTime)  $($src.Length) bytes"
Write-Host "src-tauri/binaries: $($dst1.LastWriteTime)  $($dst1.Length) bytes"
Write-Host "target/debug:       $($dst2.LastWriteTime)  $($dst2.Length) bytes"
```

Resultado esperado: todos com 31/05/2026 e 57,557,202 bytes.

- [ ] **Step 4: Testar a app — submeter job com perfil broadcast-hd**

Arrancar `npm run tauri dev` (ou a sessão já existente) e submeter o ficheiro `Entrevista Arnaldo Silva Na Rtp Mundo - 30.05.2026_social_25mb_1_minute_720p60.mp4` com perfil `broadcast-hd`.

Resultado esperado nos logs: `[DIAG] step=transcode:start` aparece (sem erro "A dynamic import callback").

> Nota: não há commit neste task — os binários são gitignored.

---

## Task 2: package.json — auto-cópia após engine:build:win

**Ficheiros:**

- Modify: `package.json` (scripts `engine:build:win`, `engine:build:mac`, `engine:build:linux`, `engine:build`)

**Contexto:** `pkg` com target único não adiciona sufixo ao ficheiro de saída. Com múltiplos targets adiciona `-win`/`-macos`/`-linux`. Os targets Tauri esperados: `nexora-engine-x86_64-pc-windows-msvc.exe`, `nexora-engine-aarch64-apple-darwin`, `nexora-engine-x86_64-unknown-linux-gnu`.

- [ ] **Step 1: Verificar que engine:build:win NÃO copia actualmente**

```powershell
# Apagar temporariamente a cópia em binaries/ para confirmar que o script NÃO a recria
$dst = "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
$backup = "$dst.bak"
Move-Item $dst $backup
npm run engine:build:win 2>&1 | Select-String "nexora-engine|copy|erro" | Select-Object -Last 5
Test-Path $dst  # deve devolver False
Move-Item $backup $dst  # restaurar
```

Resultado esperado: `False` — confirma que o script actual NÃO copia para binaries/.

- [ ] **Step 2: Editar package.json — adicionar cópia em engine:build:win**

No `package.json`, alterar a linha `engine:build:win` de:

```json
"engine:build:win": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-win-x64 --output sidecar/bin/nexora-engine",
```

Para:

```json
"engine:build:win": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-win-x64 --output sidecar/bin/nexora-engine && node -e \"require('fs').copyFileSync('sidecar/bin/nexora-engine.exe','src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe')\"",
```

- [ ] **Step 3: Editar package.json — adicionar cópia em engine:build:mac**

Alterar `engine:build:mac` de:

```json
"engine:build:mac": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-mac-arm64 --output sidecar/bin/nexora-engine",
```

Para:

```json
"engine:build:mac": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-mac-arm64 --output sidecar/bin/nexora-engine && node -e \"require('fs').copyFileSync('sidecar/bin/nexora-engine','src-tauri/binaries/nexora-engine-aarch64-apple-darwin')\"",
```

- [ ] **Step 4: Editar package.json — adicionar cópia em engine:build:linux**

Alterar `engine:build:linux` de:

```json
"engine:build:linux": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-linux-x64 --output sidecar/bin/nexora-engine",
```

Para:

```json
"engine:build:linux": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-linux-x64 --output sidecar/bin/nexora-engine && node -e \"require('fs').copyFileSync('sidecar/bin/nexora-engine','src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu')\"",
```

- [ ] **Step 5: Editar package.json — adicionar cópia em engine:build (multi-plataforma)**

`pkg` com múltiplos targets adiciona sufixos `-win`/`-macos`/`-linux` ao output. Alterar `engine:build` de:

```json
"engine:build": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-win-x64,node22-mac-arm64,node22-linux-x64 --output sidecar/bin/nexora-engine",
```

Para:

```json
"engine:build": "npm run sidecar:build && pkg sidecar/dist/nexora-sidecar.cjs --no-bytecode --public --targets node22-win-x64,node22-mac-arm64,node22-linux-x64 --output sidecar/bin/nexora-engine && node -e \"const fs=require('fs');fs.copyFileSync('sidecar/bin/nexora-engine-win.exe','src-tauri/binaries/nexora-engine-x86_64-pc-windows-msvc.exe');fs.copyFileSync('sidecar/bin/nexora-engine-macos','src-tauri/binaries/nexora-engine-aarch64-apple-darwin');fs.copyFileSync('sidecar/bin/nexora-engine-linux','src-tauri/binaries/nexora-engine-x86_64-unknown-linux-gnu')\"",
```

- [ ] **Step 6: Verificar que engine:build:win agora copia automaticamente**

```powershell
$dst = "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
$backup = "$dst.bak"
Move-Item $dst $backup
npm run engine:build:win
$exists = Test-Path $dst
$size   = if ($exists) { (Get-Item $dst).Length } else { 0 }
Write-Host "Ficheiro criado: $exists  ($size bytes)"
Move-Item -Force $dst "$dst.new"
Move-Item $backup $dst  # restaurar original
Remove-Item "$dst.new"
```

Resultado esperado: `Ficheiro criado: True  (57557202 bytes)` — confirma que a cópia aconteceu.

- [ ] **Step 7: Commit**

```powershell
git add package.json
git commit -m "fix(engine): auto-copy nexora-engine.exe para src-tauri/binaries/ apos build"
```

---

## Task 3: 06-run-dev.ps1 — sync check em nxVerifyEnvironment

**Ficheiros:**

- Modify: `scripts/06-run-dev.ps1` (função `nxVerifyEnvironment`, linhas 333–361)

- [ ] **Step 1: Localizar o fim de nxVerifyEnvironment para inserir o bloco**

```powershell
Select-String -Path "scripts\06-run-dev.ps1" -Pattern "nxOk.*Sidecar|nxVerifyEnvironment" | Select-Object LineNumber, Line
```

Resultado esperado: a linha `nxOk "Sidecar Node.js presente"` deve aparecer perto do fim da função, antes do `}` de fecho.

- [ ] **Step 2: Adicionar bloco de sync do engine no final de nxVerifyEnvironment**

No ficheiro `scripts/06-run-dev.ps1`, imediatamente antes do `}` de fecho de `nxVerifyEnvironment` (após o bloco `# Verificar Sidecar`), inserir:

```powershell
    # Verificar Engine — sincronizar sidecar/bin/ → src-tauri/binaries/ se necessário
    $engineSrc = Join-Path $ProjectRoot "sidecar\bin\nexora-engine.exe"
    $engineDst = Join-Path $ProjectRoot "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
    if (Test-Path $engineSrc) {
        $srcDate  = (Get-Item $engineSrc).LastWriteTime
        $dstDate  = if (Test-Path $engineDst) { (Get-Item $engineDst).LastWriteTime } else { [DateTime]::MinValue }
        if ($srcDate -gt $dstDate) {
            nxWarn "Engine desactualizado. A sincronizar sidecar/bin/ -> src-tauri/binaries/..."
            Copy-Item -LiteralPath $engineSrc -Destination $engineDst -Force
            nxOk "Engine sincronizado (sidecar/bin/ -> src-tauri/binaries/)"
        } else {
            nxOk "Nexora Engine sincronizado"
        }
    } else {
        nxWarn "sidecar/bin/nexora-engine.exe nao existe -- corre: npm run engine:build:win"
    }
```

O bloco inserido fica assim no contexto:

```powershell
    # Verificar Sidecar
    $sidecarBin = Join-Path $ProjectRoot "sidecar\dist\nexora-sidecar.cjs"
    if (-not (Test-Path $sidecarBin)) {
        nxWarn "Sidecar Node.js nao compilado. A compilar..."
        npm run sidecar:build
    } else {
        nxOk "Sidecar Node.js presente"
    }

    # Verificar Engine — sincronizar sidecar/bin/ → src-tauri/binaries/ se necessário
    $engineSrc = Join-Path $ProjectRoot "sidecar\bin\nexora-engine.exe"
    $engineDst = Join-Path $ProjectRoot "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
    if (Test-Path $engineSrc) {
        $srcDate  = (Get-Item $engineSrc).LastWriteTime
        $dstDate  = if (Test-Path $engineDst) { (Get-Item $engineDst).LastWriteTime } else { [DateTime]::MinValue }
        if ($srcDate -gt $dstDate) {
            nxWarn "Engine desactualizado. A sincronizar sidecar/bin/ -> src-tauri/binaries/..."
            Copy-Item -LiteralPath $engineSrc -Destination $engineDst -Force
            nxOk "Engine sincronizado (sidecar/bin/ -> src-tauri/binaries/)"
        } else {
            nxOk "Nexora Engine sincronizado"
        }
    } else {
        nxWarn "sidecar/bin/nexora-engine.exe nao existe -- corre: npm run engine:build:win"
    }
}
```

- [ ] **Step 3: Verificar que a função foi correctamente editada**

```powershell
Select-String -Path "scripts\06-run-dev.ps1" -Pattern "Engine desactualizado|Engine sincronizado|engine:build:win" | Select-Object LineNumber, Line
```

Resultado esperado: as 3 mensagens aparecem nas linhas esperadas.

- [ ] **Step 4: Testar comportamento — simular engine desactualizado**

```powershell
# Tornar o ficheiro em binaries/ artificialmente antigo
$dst = "src-tauri\binaries\nexora-engine-x86_64-pc-windows-msvc.exe"
(Get-Item $dst).LastWriteTime = [DateTime]"2026-05-28 20:58:58"

# Invocar apenas a função (sem arrancar tauri dev)
. "scripts\06-run-dev.ps1"
# Definir ProjectRoot manualmente para teste
$ProjectRoot = (Get-Location).Path
# Chamar a função directamente
nxVerifyEnvironment
```

Resultado esperado: o aviso `Engine desactualizado. A sincronizar...` aparece, seguido de `Engine sincronizado`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/06-run-dev.ps1
git commit -m "fix(dev): sincronizar nexora-engine automaticamente em nxVerifyEnvironment"
```
