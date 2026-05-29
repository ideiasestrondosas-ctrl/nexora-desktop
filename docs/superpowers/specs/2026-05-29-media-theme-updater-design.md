# Design: Media Loading, Light Mode Fallback & UpdateModal — v0.30.5

**Data:** 2026-05-29  
**Versão alvo:** v0.30.5-beta.1  
**Contexto:** Bugs identificados em testes Windows Sandbox com v0.30.4-beta.1

---

## Problema 1 — Media não carrega (thumbnails, player, comparador)

### Sintoma

- Thumbnails na biblioteca não aparecem
- Player inline (original e processado) mostra controlos mas vídeo preto/vazio
- Comparador mostra ecrã preto (vídeos não carregam)

### Causa raiz

O `assetProtocol.scope` em `tauri.conf.json` usa `["$HOME/**", "$TEMP/**"]` mas o glob `**` pode não fazer match de caminhos absolutos Windows no Tauri 2.x dependendo de como o handler normaliza os paths. Diagnóstico adicional via `onError` confirma o HTTP status.

Para thumbnails existe um fallback adicional: caso o asset protocol falhe, invocar um comando Rust que lê o ficheiro e retorna base64 — garante que thumbnails funcionam em qualquer configuração.

### Alterações

**`src-tauri/tauri.conf.json`**

```json
"assetProtocol": {
  "enable": true,
  "scope": [
    "**",
    "$HOME/**",
    "$TEMP/**",
    "$APPDATA/**",
    "$LOCALAPPDATA/**",
    "$VIDEO/**",
    "$DESKTOP/**",
    "$DOWNLOAD/**"
  ]
}
```

Múltiplos patterns para garantir cobertura independentemente de qual resolve correctamente.

**`src-tauri/Cargo.toml`** — adicionar dependência:

```toml
base64 = "0.22"
```

**`src-tauri/src/commands/assets.rs`** — novo comando:

```rust
#[tauri::command]
pub fn read_thumbnail_base64(path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}
```

Registar em `lib.rs` junto aos outros comandos.

**`src/pages/LibraryPage.tsx`** — thumbnail com fallback IPC:

```tsx
// Estado por asset: string (src a usar) | null (a carregar) | 'error' (IPC também falhou)
// 1. Renderizar <img src={convertFileSrc(asset.thumbnail_path)}>
// 2. onError → invoke('read_thumbnail_base64', { path }) → setThumbnailSrc(`data:image/jpeg;base64,${data}`)
// 3. Se IPC falhar → mostrar ícone Film (comportamento actual)
```

**`src/pages/AssetDetailPage.tsx`**

- Adicionar `onError` ao elemento `<video>`:
  ```tsx
  onError={() => logActivity('video_load_error', `path: ${src.slice(-80)}`)}
  ```
- Adicionar `onError` ao elemento `<img>` do thumbnail no hero:
  ```tsx
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none';
    // fallback IPC igual ao LibraryPage
  }}
  ```

**`src/components/VisualComparatorPlayer.tsx`**

- Adicionar import: `import { logActivity } from '@/lib/activityLog';`
- Adicionar `onError` a ambos os `<video>`:
  ```tsx
  onError={() => logActivity('comparator_load_error', 'error', `path: ${path.slice(-80)}`)}
  ```

---

## Problema 2 — Light mode com fundo preto (Mica sem fallback)

### Sintoma

Em Windows Sandbox (e em geral sem Mica: Windows 10, VMs), a zona de conteúdo principal aparece com fundo preto em modo claro.

### Causa raiz

`index.css` define `body`, `#root` e `main` como `background: transparent` para `[data-platform='windows']`, delegando a cor de fundo ao efeito Mica. Quando Mica não está disponível (Sandbox, `apply_mica` falha silenciosamente via `.ok()`), o HWND subjacente ao WebView2 aparece a preto.

### Alterações

**`src-tauri/src/lib.rs`**

```rust
// Guardar resultado do apply_mica (actualmente descartado com .ok())
let mica_ok = apply_mica(&main_window, Some(true)).is_ok();
main_window.emit("mica-status", mica_ok).ok();
```

**`src/App.tsx`** — ouvir o evento e aplicar atributo ao `<html>`:

```tsx
useEffect(() => {
  const unlisten = listen<boolean>('mica-status', (e) => {
    document.documentElement.dataset.mica = e.payload ? 'active' : 'inactive';
  });
  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

**`src/index.css`** — fallback sólido quando Mica não está activo:

```css
html[data-platform='windows'][data-mica='inactive'] body,
html[data-platform='windows'][data-mica='inactive'] #root {
  background-color: var(--color-bg-primary);
}
html[data-platform='windows'][data-mica='inactive'] main,
html[data-platform='windows'][data-mica='inactive'] .flex.h-screen {
  background-color: var(--color-bg-primary);
}
```

Quando `data-mica` ainda não está definido (estado inicial antes do evento chegar), os backgrounds continuam transparentes por um frame — aceitável porque o evento chega em <100ms após startup.

Nota: macOS usa `apply_vibrancy` com a mesma lógica; emitir `mica-status` também para macOS usando o resultado do `apply_vibrancy`.

---

## Problema 3 — UpdateModal: notas genéricas e barra estática

### Problema 3a — Notas de release genéricas

O `ci-generate-updater-json.mjs` hardcoda `notes: 'See the CHANGELOG.md for details.'`. O modal mostra este texto em vez do conteúdo real.

**Fix — `scripts/ci-generate-updater-json.mjs`:**

```js
function extractChangelogSection(changelogText, version) {
  // Procura "## v{version}" ou "## {version}" no CHANGELOG
  // Extrai texto até ao próximo "## "
  // Retorna null se não encontrar
  const versionNumeric = version.replace(/-.*$/, ''); // "0.30.5"
  const patterns = [
    new RegExp(`## v${versionNumeric}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`),
    new RegExp(`## ${versionNumeric}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`),
  ];
  for (const pattern of patterns) {
    const match = changelogText.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const notes = extractChangelogSection(changelog, version) ?? 'Ver CHANGELOG.md para detalhes.';
```

### Problema 3b — Barra de progresso estática

Bug de stale closure: `totalSize` é `0` quando o callback de `downloadAndInstall` é criado, por isso `progress` nunca avança.

**Fix — `src/components/UpdateModal.tsx`:**

```tsx
const totalSizeRef = useRef(0); // ref sincronamente actualizado

// Substituir no callback de downloadAndInstall:
if (event.event === 'Started') {
  totalSizeRef.current = event.data.contentLength ?? 0;
  setTotalSize(totalSizeRef.current);
} else if (event.event === 'Progress') {
  setDownloaded((prev) => {
    const next = prev + (event.data.chunkLength ?? 0);
    if (totalSizeRef.current > 0) {
      setProgress(Math.round((next / totalSizeRef.current) * 100));
    }
    return next;
  });
}
```

Adicionar transição CSS à barra:

```tsx
className = 'bg-blue-500 h-1.5 rounded-full transition-[width] duration-300 ease-out';
```

---

## Ficheiros a alterar

| Ficheiro                                    | Alteração                                               |
| ------------------------------------------- | ------------------------------------------------------- |
| `src-tauri/Cargo.toml`                      | Adicionar dependência `base64 = "0.22"`                 |
| `src-tauri/tauri.conf.json`                 | Scope alargado com múltiplos patterns                   |
| `src-tauri/src/commands/assets.rs`          | Novo comando `read_thumbnail_base64`                    |
| `src-tauri/src/lib.rs`                      | Registar comando + emitir `mica-status` após apply_mica |
| `src/App.tsx`                               | Ouvir `mica-status`, aplicar `data-mica`                |
| `src/index.css`                             | Fallback sólido quando `data-mica=inactive`             |
| `src/pages/LibraryPage.tsx`                 | Fallback IPC para thumbnails                            |
| `src/pages/AssetDetailPage.tsx`             | `onError` em video e img                                |
| `src/components/VisualComparatorPlayer.tsx` | Import logActivity + `onError` em ambos os video        |
| `src/components/UpdateModal.tsx`            | Fix stale closure + transição CSS                       |
| `scripts/ci-generate-updater-json.mjs`      | Parse CHANGELOG para notas reais                        |

---

## Critérios de sucesso

- [ ] Thumbnails aparecem na biblioteca após processamento
- [ ] Player inline (original e processado) reproduz vídeo
- [ ] Comparador mostra ambos os vídeos lado a lado
- [ ] Em modo claro sem Mica, fundo do conteúdo é branco (não preto)
- [ ] Em modo escuro, glassmorphism mantém-se inalterado quando Mica está activo
- [ ] UpdateModal mostra secção do CHANGELOG da versão em causa
- [ ] Barra de progresso do download avança progressivamente

---

## Fora de âmbito

- Renderização Markdown das notas (react-markdown) — melhoramento futuro
- Servidor HTTP local como alternativa ao asset protocol — só se esta abordagem falhar
- Outros ecrãs com cores hardcoded (`bg-gray-800`) — sessão de cleanup separada
