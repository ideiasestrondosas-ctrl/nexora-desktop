---
trigger: always_on
---

NEXORA DESKTOP - Regras obrigatorias (workspace: C:\Dev\nexora-desktop)

    ANTES de qualquer trabalho, le SEMPRE:
    1. PROGRESS-DESKTOP.md  (estado do projecto)
    2. SYNC-STATE.md        (o que o Claude fez recentemente)
    3. BOUNDARIES.md        (zonas permitidas/proibidas)

    WORKSPACE ACTIVO (podes escrever):
       C:\Dev\nexora-desktop\

    PROJECTO BASE - NUNCA MODIFICAR:
       C:\Dev\Nexora Media Processing\

    REGRAS:
    - TypeScript strict - sem 'any' implicito
    - FFmpeg: execFile com array - NUNCA exec com string
    - Codigo em ingles, comentarios em portugues de Portugal
    - Paleta: #1A6FD4 (azul) e #4FB8A0 (verde)

    APOS cada resposta com codigo:
    - Actualiza PROGRESS-DESKTOP.md
    - Actualiza SYNC-STATE.md
