# Nexora Desktop — Alpha Testing Guide

**Versão:** v0.29.0-alpha.1  
**Data:** 2026-05  
**Contacto:** ideiasestrondosas@gmail.com

---

## Requisitos Mínimos

| Sistema         | Versão mínima           |
| --------------- | ----------------------- |
| Windows         | 10 (x64)                |
| macOS           | 11 Big Sur              |
| Ubuntu / Debian | 20.04 LTS               |
| RAM             | 4 GB (8 GB recomendado) |
| Disco           | 2 GB livres             |

---

## Instalação

### Windows

1. Descarrega `Nexora_0.29.0-alpha.1_x64.msi` (ou `.exe`)
2. Executa o instalador — clica "Mais informações" → "Executar mesmo assim" se aparecer aviso do SmartScreen (app não está ainda assinada)
3. Lança via menu Iniciar

### macOS

1. Descarrega `Nexora_0.29.0-alpha.1_universal.dmg`
2. Abre o DMG, arrasta para Aplicações
3. No Finder, clica com botão direito → Abrir (primeira execução)

### Linux

1. Descarrega `.deb` ou `.AppImage`
2. `.deb`: `sudo dpkg -i nexora_0.29.0-alpha.1_amd64.deb`
3. `.AppImage`: `chmod +x Nexora*.AppImage && ./Nexora*.AppImage`

---

## Bugs Conhecidos

- [ ] _(actualizar antes de enviar)_

---

## Lista de Acções de Teste

Por favor testa cada item e nota o que aconteceu (funcionou / erro / comportamento estranho).

### Onboarding

- [ ] **01** — Na primeira abertura aparece o modal de boas-vindas com 4 passos?
- [ ] **02** — Consegues seleccionar uma pasta de output no passo 2?
- [ ] **03** — O toggle de telemetria no passo 3 funciona?
- [ ] **04** — Após clicar "Começar" o modal fecha e não volta a aparecer?
- [ ] **05** — Em Settings → Avançado, o botão "Reset Onboarding" faz o modal aparecer no próximo arranque?

### Importar Ficheiros

- [ ] **06** — Arrasta um ficheiro de vídeo para a janela — aparece o modal de batch submit?
- [ ] **07** — Usa Biblioteca → "Scan Directory" para importar uma pasta com vídeos?
- [ ] **08** — O asset aparece na Biblioteca após ingest?

### Fila e Transcodificação

- [ ] **09** — Submete um job com o perfil "Web HD" — o job aparece na Fila?
- [ ] **10** — O job completa sem erros? Qual foi o tempo aproximado?
- [ ] **11** — O ficheiro de output foi criado na pasta correcta?
- [ ] **12** — Se cancelares um job em curso, desaparece da fila?

### Watch Folders

- [ ] **13** — Em Settings → Watch Folders, consegues adicionar uma pasta?
- [ ] **14** — Copias um ficheiro `.mp4` para essa pasta — abre o modal de submit automaticamente?
- [ ] **15** — O toggle "Activa/Em pausa" desactiva e reactiva a monitorização?

### Reportar Problema

- [ ] **16** — O ícone de bug na barra de topo abre o modal "Reportar Problema"?
- [ ] **17** — Preenches título, clicas "Guardar como ficheiro" — é criado um `.txt` em Downloads?
- [ ] **18** — O botão "Abrir GitHub Issue" abre o browser com o título pré-preenchido?

### Cloud (opcional — só se tiveres credenciais)

- [ ] **19** — Em Settings → Cloud, consegues adicionar um perfil FTP/S3?
- [ ] **20** — Ao submeter um job com destino cloud, o upload ocorre após transcodificação?

### Geral

- [ ] **21** — A app arranca e fecha sem crashes após 15 minutos de uso?
- [ ] **22** — Alterna entre todos os ecrãs (Dashboard, Biblioteca, Fila, Perfis, Settings, Registos) — algum fica em branco ou crashou?

---

## Como Reportar

1. **Botão na app:** ícone de bug na barra de topo → preenche título + descrição → "Guardar como ficheiro" ou "Abrir GitHub Issue"
2. **GitHub Issues:** https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues
3. **Email:** ideiasestrondosas@gmail.com

Por favor inclui sempre:

- Sistema operativo e versão
- O que fizeste antes do problema
- O que esperavas vs o que aconteceu
- O ficheiro de log se conseguires (botão "Guardar como ficheiro" no modal de bug)
