# Processo de Release — Nexora Desktop

## Pré-requisitos

- Node.js 20 LTS
- Rust stable (via `rustup`)
- Tauri CLI: `npm install -g @tauri-apps/cli`
- Acesso aos secrets do repositório GitHub

---

## 1. Certificados de Assinatura

### Windows (Code Signing)

A assinatura no Windows requer um certificado EV (Extended Validation) ou OV (Organization Validation).

**Secrets necessários no GitHub:**

```
TAURI_SIGNING_PRIVATE_KEY      — chave privada Tauri (gerada por tauri signer generate)
TAURI_SIGNING_PRIVATE_KEY_PASSWORD — password da chave privada
WINDOWS_CERTIFICATE            — certificado .pfx em base64
WINDOWS_CERTIFICATE_PASSWORD   — password do .pfx
```

**Gerar chave Tauri:**

```bash
npx tauri signer generate -w ~/.tauri/nexora.key
# Guarda a chave e password nos GitHub Secrets
```

**Configurar em `tauri.conf.json`:**

```json
"bundle": {
  "windows": {
    "certificateThumbprint": null,
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.sectigo.com"
  }
}
```

### macOS (Notarization)

**Secrets necessários:**

```
APPLE_CERTIFICATE             — certificado Developer ID Application em base64
APPLE_CERTIFICATE_PASSWORD    — password do certificado
APPLE_SIGNING_IDENTITY        — "Developer ID Application: Nome (TEAMID)"
APPLE_ID                      — Apple ID da conta de developer
APPLE_PASSWORD                — App-specific password (appleid.apple.com)
APPLE_TEAM_ID                 — Team ID da Apple Developer account
```

**Processo:**

1. Exportar certificado "Developer ID Application" do Keychain como `.p12`
2. Converter para base64: `base64 -i cert.p12 | pbcopy`
3. Configurar em `tauri.conf.json`:

```json
"bundle": {
  "macOS": {
    "signingIdentity": "Developer ID Application: Nexora (TEAMID)",
    "providerShortName": "TEAMID",
    "entitlements": "entitlements.plist"
  }
}
```

### Linux

Linux não requer assinatura de código obrigatória. Os pacotes `.deb` e `.AppImage` são distribuídos sem assinatura, mas podem ser assinados com GPG:

```bash
gpg --detach-sign --armor dist/nexora-desktop_*.AppImage
```

---

## 2. Bump de Versão

Antes de qualquer release, actualizar a versão em **três ficheiros**:

```bash
# 1. package.json
npm version 0.23.0 --no-git-tag-version

# 2. src-tauri/Cargo.toml — campo version = "0.18.0"
# 3. src-tauri/tauri.conf.json — campo "version": "0.18.0"
```

Confirmar que os três estão em sincronia antes de criar a tag.

---

## 3. Processo de Release Manual

```bash
# 1. Garantir branch limpa
git checkout main
git pull origin main

# 2. Bump de versão (ver secção 2)

# 3. Actualizar CHANGELOG.md

# 4. Commit e tag
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): v0.23.0"
git tag v0.23.0
git push origin main --tags

# 5. O workflow build.yml dispara automaticamente e cria o GitHub Release
```

---

## 4. GitHub Actions — Workflow de Build

O ficheiro `.github/workflows/build.yml` executa em push de tags `v*.*.*`:

- Compila para Windows (x64), macOS (Universal), Linux (x64)
- Assina com os certificados configurados nos secrets
- Cria GitHub Release com os artefactos
- Activa o auto-updater Tauri (ADR-D009)

**Verificar** antes de cada release:

- [ ] CI verde em `main`
- [ ] Versão consistente nos 3 ficheiros
- [ ] CHANGELOG actualizado
- [ ] Secrets de assinatura válidos (certificados não expirados)

---

## 5. Auto-updater

O Tauri auto-updater (ADR-D009) verifica actualizações via endpoint configurado em `tauri.conf.json`:

```json
"updater": {
  "active": true,
  "endpoints": ["https://releases.nexora.app/{{target}}/{{arch}}/{{current_version}}"],
  "dialog": true,
  "pubkey": "..."
}
```

A chave pública do updater é gerada com `tauri signer generate` e deve ser mantida estável entre releases.
