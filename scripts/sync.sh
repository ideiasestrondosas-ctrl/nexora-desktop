#!/usr/bin/env bash
# Nexora Desktop Sync - macOS e Linux
# Equivalente ao sync.ps1 para Windows
#
# INICIO DE SESSAO:  ./scripts/sync.sh start
# FIM DE SESSAO:     ./scripts/sync.sh end "feat: descricao"
# APENAS STATUS:     ./scripts/sync.sh status

set -euo pipefail

ACTION="${1:-status}"
MESSAGE="${2:-}"

# Detectar workspace (relativo ao script ou caminho fixo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
REPO_OWNER="ideiasestrondosas-ctrl"
REPO_NAME="nexora-desktop"

# Cores
CYA='\033[0;36m'; GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; GRY='\033[0;37m'; RST='\033[0m'

hdr()  { echo ""; echo -e "${CYA}  ============================================${RST}"; echo -e "${CYA}  $1${RST}"; echo -e "${CYA}  ============================================${RST}"; }
ok()   { echo -e "${GRN}  [OK]    $1${RST}"; }
warn() { echo -e "${YEL}  [AVISO] $1${RST}"; }
err()  { echo -e "${RED}  [ERRO]  $1${RST}"; }
info() { echo -e "${GRY}          $1${RST}"; }

cd "$WORKSPACE"

# Carregar GITHUB_TOKEN do .env se existir
GITHUB_TOKEN=""
if [[ -f ".env" ]]; then
    GITHUB_TOKEN=$(grep -E '^\s*GITHUB_TOKEN\s*=' .env | head -1 | sed "s/.*=//;s/['\"]//g;s/[[:space:]]//g") || true
fi

# ---- STATUS -------------------------------------------------
if [[ "$ACTION" == "status" ]]; then
    hdr "ESTADO DO REPOSITORIO"
    BRANCH=$(git branch --show-current 2>/dev/null || echo "desconhecido")
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    ok "Branch: $BRANCH"
    [[ -n "$REMOTE" ]] && ok "Remote: $REMOTE" || warn "Sem remote configurado"

    echo ""
    echo -e "${GRY}  -- Ficheiros modificados --${RST}"
    git status --short | sed 's/^/  /' || true

    echo ""
    echo -e "${GRY}  -- Ultimos 5 commits --${RST}"
    git log --oneline -5 | sed 's/^/  /' || true

    echo ""
    echo -e "${GRY}  -- SYNC-STATE (primeiras 20 linhas) --${RST}"
    if [[ -f "SYNC-STATE.md" ]]; then
        head -20 SYNC-STATE.md | sed 's/^/  /'
    else
        warn "SYNC-STATE.md nao encontrado"
    fi
    exit 0
fi

# ---- INICIO DE SESSAO ---------------------------------------
if [[ "$ACTION" == "start" ]]; then
    hdr "INICIO DE SESSAO - Sincronizar com GitHub"

    DIRTY=$(git status --short 2>/dev/null || true)
    if [[ -n "$DIRTY" ]]; then
        warn "Ha ficheiros nao commitados:"
        echo "$DIRTY" | sed 's/^/          /'
        echo ""
        read -rp "  Continuar mesmo assim? [s/N] " ans
        [[ "$ans" =~ ^[Ss]$ ]] || { echo "  Cancelado."; exit 0; }
    fi

    echo ""
    echo "  A fazer git pull..."
    if git pull --rebase; then
        ok "Pull concluido"
    else
        err "Pull falhou - possiveis conflitos"
        info "git status              (ver ficheiros em conflito)"
        info "git rebase --abort      (cancelar o rebase)"
        info "git pull --no-rebase    (tentar sem rebase)"
        exit 1
    fi

    hdr "ESTADO DO ULTIMO HANDOFF (SYNC-STATE.md)"
    if [[ -f "SYNC-STATE.md" ]]; then
        cat SYNC-STATE.md | sed 's/^/  /'
    else
        warn "SYNC-STATE.md nao encontrado"
    fi

    echo ""
    echo -e "${GRY}  Ultimo commit:${RST}"
    git log --oneline -1 | sed 's/^/  /'
    echo ""
    ok "Sessao iniciada. Podes comecar a trabalhar."
    info "Quando acabares: ./scripts/sync.sh end 'descricao do trabalho'"
    exit 0
fi

# ---- FIM DE SESSAO ------------------------------------------
if [[ "$ACTION" == "end" ]]; then
    hdr "FIM DE SESSAO - Guardar e enviar para GitHub"

    if [[ -z "$MESSAGE" ]]; then
        echo ""
        echo "Convencoes de Commit (SemVer):"
        echo "  feat:            (Nova funcionalidade -> MINOR)"
        echo "  fix:             (Correcao de bug -> PATCH)"
        echo "  docs:            (Documentacao -> PATCH)"
        echo "  refactor:        (Refatorizacao -> PATCH)"
        echo "  BREAKING CHANGE: (Alteracao disruptiva -> MAJOR)"
        echo ""
        read -rp "  Tipo (default: feat): " CTYPE
        CTYPE="${CTYPE:-feat}"
        read -rp "  Descricao: " CDESC
        CDESC="${CDESC:-atualizacoes gerais}"
        MESSAGE="$CTYPE: $CDESC"
    fi

    DIRTY=$(git status --short 2>/dev/null || true)

    if [[ -z "$DIRTY" ]]; then
        ok "Sem alteracoes para commitar - a tentar push directo..."
    else
        echo ""
        echo -e "${GRY}  -- Ficheiros a commitar --${RST}"
        echo "$DIRTY" | sed 's/^/  /'
        echo ""

        # Verificar SYNC-STATE.md
        if ! git status --short SYNC-STATE.md 2>/dev/null | grep -q .; then
            warn "SYNC-STATE.md nao foi modificado nesta sessao"
            info "Recomendado: actualiza SYNC-STATE.md antes de fechar"
            read -rp "  Continuar sem actualizar SYNC-STATE.md? [s/N] " ans
            [[ "$ans" =~ ^[Ss]$ ]] || { echo "  Cancelado."; exit 0; }
        else
            ok "SYNC-STATE.md actualizado nesta sessao"
        fi

        git add --all
        if git commit -m "$MESSAGE"; then
            ok "Commit criado: $MESSAGE"
        else
            err "Commit falhou"
            exit 1
        fi
    fi

    # Versao - ler de package.json
    NEW_VERSION=""
    if [[ -f "package.json" ]] && command -v node &>/dev/null; then
        CURRENT=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
        if [[ -n "$CURRENT" ]]; then
            IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
            if [[ "$MESSAGE" =~ "BREAKING CHANGE" ]]; then
                SUGGESTED="$((MAJOR+1)).0.0"
            elif [[ "$MESSAGE" =~ ^feat: ]]; then
                SUGGESTED="$MAJOR.$((MINOR+1)).0"
            else
                SUGGESTED="$MAJOR.$MINOR.$((PATCH+1))"
            fi

            echo ""
            echo "  Versao actual: $CURRENT"
            echo "  Escolha a proxima versao:"
            echo "  1) Patch ($MAJOR.$MINOR.$((PATCH+1)))"
            echo "  2) Minor ($MAJOR.$((MINOR+1)).0)"
            echo "  3) Major ($((MAJOR+1)).0.0)"
            echo "  4) Ignorar versao (apenas push)"
            echo ""
            read -rp "  Opcao (default: $SUGGESTED) [1/2/3/4]: " VCHOICE

            case "$VCHOICE" in
                1) NEW_VERSION="$MAJOR.$MINOR.$((PATCH+1))" ;;
                2) NEW_VERSION="$MAJOR.$((MINOR+1)).0" ;;
                3) NEW_VERSION="$((MAJOR+1)).0.0" ;;
                4) NEW_VERSION="" ;;
                *) NEW_VERSION="$SUGGESTED" ;;
            esac
        fi
    fi

    if [[ -n "$NEW_VERSION" ]]; then
        echo ""
        info "A aplicar versao v$NEW_VERSION..."

        # package.json
        if [[ -f "package.json" ]] && command -v node &>/dev/null; then
            node -e "
                const fs = require('fs');
                const p = JSON.parse(fs.readFileSync('package.json','utf8'));
                p.version = '$NEW_VERSION';
                fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
            "
            ok "package.json -> $NEW_VERSION"
        fi

        # src-tauri/Cargo.toml
        if [[ -f "src-tauri/Cargo.toml" ]]; then
            # Substitui versao na seccao [package] (primeira ocorrencia)
            perl -0777 -i -pe \
                's/(\[package\][^\[]*?version\s*=\s*")[^"]+(")/\1'"$NEW_VERSION"'\2/s' \
                src-tauri/Cargo.toml
            ok "src-tauri/Cargo.toml -> $NEW_VERSION"
        fi

        # src-tauri/tauri.conf.json
        if [[ -f "src-tauri/tauri.conf.json" ]] && command -v node &>/dev/null; then
            node -e "
                const fs = require('fs');
                const c = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8'));
                if ('version' in c) {
                    c.version = '$NEW_VERSION';
                    fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(c, null, 2) + '\n');
                    console.log('tauri.conf.json actualizado');
                }
            " && ok "src-tauri/tauri.conf.json -> $NEW_VERSION" || true
        fi

        # CHANGELOG.md
        DATE=$(date +%Y-%m-%d)
        if [[ -f "CHANGELOG.md" ]]; then
            ENTRY="## [$NEW_VERSION] - $DATE\n\n### Added\n- $MESSAGE\n"
            if grep -q "## \[Unreleased\]" CHANGELOG.md; then
                sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n$ENTRY/" CHANGELOG.md && rm -f CHANGELOG.md.bak
            else
                printf "# Changelog\n\n$ENTRY\n" | cat - CHANGELOG.md > /tmp/cl_tmp && mv /tmp/cl_tmp CHANGELOG.md
            fi
        fi

        # PROGRESS-DESKTOP.md
        if [[ -f "PROGRESS-DESKTOP.md" ]]; then
            sed -i.bak "s/| \*\*Versao\*\* | .* |/| **Versao** | $NEW_VERSION |/" PROGRESS-DESKTOP.md && rm -f PROGRESS-DESKTOP.md.bak
        fi

        git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md PROGRESS-DESKTOP.md 2>/dev/null || true
        git commit -m "chore(release): v$NEW_VERSION" --no-verify
        git tag -a "v$NEW_VERSION" -m "Nexora Desktop v$NEW_VERSION"
        ok "Versao v$NEW_VERSION preparada e tag criada"
        IS_RELEASE=true
    fi

    # Push
    echo ""
    echo "  A enviar para GitHub..."
    if [[ -n "$GITHUB_TOKEN" ]]; then
        REMOTE_URL=$(git remote get-url origin)
        BASE_REPO=$(echo "$REMOTE_URL" | sed 's|https://[^@]*@||' | sed 's|https://||')
        AUTH_URL="https://$REPO_OWNER:$GITHUB_TOKEN@$BASE_REPO"
        git push -u "$AUTH_URL" "$(git branch --show-current)" --tags
    else
        git push -u origin "$(git branch --show-current)" --tags
    fi

    if [[ $? -eq 0 ]]; then
        ok "Push concluido"

        # GitHub Release via API
        if [[ "${IS_RELEASE:-false}" == "true" && -n "$GITHUB_TOKEN" ]]; then
            info "A criar GitHub Release v$NEW_VERSION..."
            RELEASE_JSON=$(printf '{"tag_name":"v%s","name":"Nexora Desktop v%s","body":"### Alteracoes\n\n- %s\n\nConsulta o CHANGELOG.md para detalhes.","draft":false,"prerelease":false}' \
                "$NEW_VERSION" "$NEW_VERSION" "$MESSAGE")
            HTTP_STATUS=$(curl -s -o /tmp/gh_release_resp.json -w "%{http_code}" \
                -X POST \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Accept: application/vnd.github+json" \
                -H "Content-Type: application/json; charset=utf-8" \
                -d "$RELEASE_JSON" \
                "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases")
            if [[ "$HTTP_STATUS" == "201" ]]; then
                ok "GitHub Release v$NEW_VERSION publicada!"
            else
                warn "Erro ao criar Release (HTTP $HTTP_STATUS): $(cat /tmp/gh_release_resp.json)"
            fi
        fi
    else
        err "Push falhou - tenta manualmente: git push -u origin $(git branch --show-current) --tags"
    fi

    echo ""
    ok "Sessao terminada."
    info "O outro agente deve correr './scripts/sync.sh start' antes de comecar."
    exit 0
fi

echo "Uso: $0 [start|end|status] [mensagem]"
exit 1
