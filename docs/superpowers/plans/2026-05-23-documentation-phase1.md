# Documentation Phase 1 — README + HelpModal Cloud Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update README with cloud features and add a Cloud tab to HelpModal with full i18n across all 15 languages.

**Architecture:** Three sequential tasks — README surgical update, HelpModal Cloud tab (reusing existing ScreenCard pattern), i18n strings for all 15 language files. No new components, no new files.

**Tech Stack:** React 19 + TypeScript, react-i18next, Lucide icons, Tailwind CSS, Markdown

---

## File Map

| File                              | Change                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `README.md`                       | Add cloud bullet to Features, add Cloud Destinations section, add Quick Start step 6                        |
| `src/components/HelpModal.tsx`    | Add `cloud` to ScreenTab type, SCREEN_TABS, TAB_COUNTS; add Cloud tab JSX; add cloud bullet to Settings tab |
| `src/i18n/locales/en/common.json` | Add `help.tabs.cloud` + `help.screens.cloud.*` + `help.screens.settings.cloud`                              |
| `src/i18n/locales/pt/common.json` | Same keys, Portuguese                                                                                       |
| `src/i18n/locales/es/common.json` | Same keys, Spanish                                                                                          |
| `src/i18n/locales/fr/common.json` | Same keys, French                                                                                           |
| `src/i18n/locales/de/common.json` | Same keys, German                                                                                           |
| `src/i18n/locales/it/common.json` | Same keys, Italian                                                                                          |
| `src/i18n/locales/ja/common.json` | Same keys, Japanese                                                                                         |
| `src/i18n/locales/ko/common.json` | Same keys, Korean                                                                                           |
| `src/i18n/locales/nl/common.json` | Same keys, Dutch                                                                                            |
| `src/i18n/locales/pl/common.json` | Same keys, Polish                                                                                           |
| `src/i18n/locales/ru/common.json` | Same keys, Russian                                                                                          |
| `src/i18n/locales/sv/common.json` | Same keys, Swedish                                                                                          |
| `src/i18n/locales/tr/common.json` | Same keys, Turkish                                                                                          |
| `src/i18n/locales/ar/common.json` | Same keys, Arabic                                                                                           |
| `src/i18n/locales/zh/common.json` | Same keys, Chinese                                                                                          |

---

## Task 1: README — Cloud Destinations

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Verify the current README has no Cloud Destinations section**

```bash
grep -c "Cloud Destinations" README.md
```

Expected output: `0`

- [ ] **Step 2: Add cloud rows to the Features table**

In `README.md`, find the Features table. The last two rows currently are:

```markdown
| **Native Notifications** | System-level notifications for job completion, errors, and quarantine alerts |
| **Comprehensive Logging** | Structured logs with filtering by level, source, and time range; exportable |
| **Factory Reset** | One-click reset to defaults, preserving or wiping all data |
```

Replace with:

```markdown
| **Native Notifications** | System-level notifications for job completion, errors, and quarantine alerts |
| **Comprehensive Logging** | Structured logs with filtering by level, source, and time range; exportable |
| **Factory Reset** | One-click reset to defaults, preserving or wiping all data |
| **Cloud Destinations** | Automatic file delivery to FTP, FTPS, SFTP, SMB, S3 (MinIO, Wasabi), and Google Drive after each job |
| **Cloud File Browser** | Browse, download, and delete files on remote storage directly from the Settings panel |
```

- [ ] **Step 3: Add Cloud Destinations section after the Transcoding Profiles section**

In `README.md`, find this line:

```markdown
---

## Keyboard Shortcuts
```

Insert before it (replacing the `---` separator that precedes Keyboard Shortcuts):

```markdown
---

## Cloud Destinations

Nexora can automatically upload processed files to remote storage after each job completes. Configure cloud profiles in **Settings → Cloud**.

| Provider | Protocol | Browse | Upload | Download | Delete | Notes |
|----------|----------|:------:|:------:|:--------:|:------:|-------|
| **FTP** | FTP / FTPS | ✅ | ✅ | ✅ | ✅ | Plain FTP or explicit TLS |
| **SFTP** | SSH | ✅ | ✅ | ✅ | ✅ | Password or key-based auth |
| **SMB** | CIFS / SMB2 | ✅ | ✅ | ✅ | ✅ | Windows shares and NAS devices |
| **S3** | HTTPS | ✅ | ✅ | ✅ | ✅ | AWS S3, MinIO, Wasabi, and compatible |
| **Google Drive** | HTTPS | ✅ | ✅ | ✅ | ✅ | OAuth device flow; upserts on re-upload |
| **iCloud** | — | ❌ | ❌ | ❌ | ❌ | Not supported (Apple API restriction) |

### How it works

1. Go to **Settings → Cloud** and add a cloud profile with your credentials.
2. When submitting a job, the default cloud destination is used automatically. Override it per-job in the batch submit modal.
3. After the job completes, Nexora uploads the output file to all configured destinations (3 retries with exponential backoff).
4. Use the **Browse** button on any profile to open the Cloud File Browser — navigate folders, download files, or delete remote files.

> **Note:** Google Drive uploads perform an upsert — if a file with the same name already exists in the destination folder, it is replaced rather than duplicated.

---

## Keyboard Shortcuts
```

- [ ] **Step 4: Add Quick Start step 6**

In `README.md`, find:

```markdown
### 5. Review Results

- When a job completes, click on the asset in **Library** to open **Asset Detail**.
- Review the **QC Report** with VMAF score, LUFS reading, and verification checks.
- Quarantined jobs appear in the **Pending Approvals** section of the Queue.

---

## Transcoding Profiles
```

Replace with:

```markdown
### 5. Review Results

- When a job completes, click on the asset in **Library** to open **Asset Detail**.
- Review the **QC Report** with VMAF score, LUFS reading, and verification checks.
- Quarantined jobs appear in the **Pending Approvals** section of the Queue.

### 6. Configure Cloud Delivery (Optional)

- Go to **Settings → Cloud** and add a cloud profile (FTP, SFTP, SMB, S3, or Google Drive).
- On your next job, the output file will be uploaded automatically after transcoding completes.
- Click **Browse** on any profile to manage files directly on the remote storage.

---

## Transcoding Profiles
```

- [ ] **Step 5: Verify Cloud Destinations section is present**

```bash
grep -c "Cloud Destinations" README.md
```

Expected output: `2` (once in Features table, once as section heading)

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs(readme): adicionar secção Cloud Destinations e step 6 no Quick Start"
```

---

## Task 2: HelpModal — Cloud Tab

**Files:**

- Modify: `src/components/HelpModal.tsx`

- [ ] **Step 1: Verify TypeScript compiles before changes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Add Cloud icon to lucide-react import**

In `src/components/HelpModal.tsx`, find:

```typescript
import {
  X,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListVideo,
  UserCircle,
  Settings,
  Terminal,
  Film,
  ExternalLink,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
```

Replace with:

```typescript
import {
  X,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListVideo,
  UserCircle,
  Settings,
  Terminal,
  Film,
  ExternalLink,
  BookOpen,
  ChevronRight,
  Cloud,
} from 'lucide-react';
```

- [ ] **Step 3: Add `cloud` to the ScreenTab union type**

Find:

```typescript
type ScreenTab = 'dashboard' | 'library' | 'queue' | 'profiles' | 'settings' | 'logs' | 'intro';
```

Replace with:

```typescript
type ScreenTab =
  | 'dashboard'
  | 'library'
  | 'queue'
  | 'profiles'
  | 'settings'
  | 'logs'
  | 'intro'
  | 'cloud';
```

- [ ] **Step 4: Add cloud entry to SCREEN_TABS between settings and logs**

Find:

```typescript
  { id: 'settings', labelKey: 'help.tabs.settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'logs', labelKey: 'help.tabs.logs', icon: <Terminal className="w-4 h-4" /> },
```

Replace with:

```typescript
  { id: 'settings', labelKey: 'help.tabs.settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'cloud', labelKey: 'help.tabs.cloud', icon: <Cloud className="w-4 h-4" /> },
  { id: 'logs', labelKey: 'help.tabs.logs', icon: <Terminal className="w-4 h-4" /> },
```

- [ ] **Step 5: Add cloud count to TAB_COUNTS**

Find:

```typescript
const TAB_COUNTS: Record<ScreenTab, number> = {
  intro: 0,
  dashboard: 1,
  library: 2,
  queue: 3,
  profiles: 1,
  settings: 2,
  logs: 1,
};
```

Replace with:

```typescript
const TAB_COUNTS: Record<ScreenTab, number> = {
  intro: 0,
  dashboard: 1,
  library: 2,
  queue: 3,
  profiles: 1,
  settings: 2,
  cloud: 3,
  logs: 1,
};
```

- [ ] **Step 6: Add cloud bullet to Settings tab**

Find in the settings tab JSX:

```tsx
<ul className="list-disc list-inside space-y-1 mt-2">
  <li>{t('help.screens.settings.general')}</li>
  <li>{t('help.screens.settings.interface')}</li>
  <li>{t('help.screens.settings.system')}</li>
  <li>{t('help.screens.settings.advanced')}</li>
</ul>
```

Replace with:

```tsx
<ul className="list-disc list-inside space-y-1 mt-2">
  <li>{t('help.screens.settings.general')}</li>
  <li>{t('help.screens.settings.interface')}</li>
  <li>{t('help.screens.settings.system')}</li>
  <li>{t('help.screens.settings.advanced')}</li>
  <li>{t('help.screens.settings.cloud')}</li>
</ul>
```

- [ ] **Step 7: Add Cloud tab JSX block between settings block and logs block**

Find:

```tsx
                {activeTab === 'logs' && (
```

Insert immediately before it:

```tsx
{
  activeTab === 'cloud' && (
    <div className="space-y-4">
      <ScreenCard
        title={t('help.screens.cloud.destinations.title')}
        icon={<Cloud className="w-4 h-4" />}
        tips={[
          t('help.screens.cloud.destinations.tip1'),
          t('help.screens.cloud.destinations.tip2'),
          t('help.screens.cloud.destinations.tip3'),
        ]}
      >
        <p>{t('help.screens.cloud.desc')}</p>
        <p className="mt-1">{t('help.screens.cloud.destinations.desc')}</p>
      </ScreenCard>
      <ScreenCard
        title={t('help.screens.cloud.browser.title')}
        icon={<Cloud className="w-4 h-4" />}
        tips={[
          t('help.screens.cloud.browser.tip1'),
          t('help.screens.cloud.browser.tip2'),
          t('help.screens.cloud.browser.tip3'),
        ]}
      >
        <p>{t('help.screens.cloud.browser.desc')}</p>
      </ScreenCard>
      <ScreenCard
        title={t('help.screens.cloud.upload.title')}
        icon={<Cloud className="w-4 h-4" />}
        tips={[
          t('help.screens.cloud.upload.tip1'),
          t('help.screens.cloud.upload.tip2'),
          t('help.screens.cloud.upload.tip3'),
        ]}
      >
        <p>{t('help.screens.cloud.upload.desc')}</p>
      </ScreenCard>
    </div>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles after changes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/HelpModal.tsx
git commit -m "feat(help): adicionar tab Cloud ao HelpModal com 3 ScreenCards"
```

---

## Task 3: I18n — English

**Files:**

- Modify: `src/i18n/locales/en/common.json`

- [ ] **Step 1: Add cloud tab label to `help.tabs`**

In `src/i18n/locales/en/common.json`, find:

```json
    "tabs": {
      "intro": "Introduction",
      "dashboard": "Dashboard",
      "library": "Library",
      "queue": "Queue",
      "profiles": "Profiles",
      "settings": "Settings",
      "logs": "Logs"
    },
```

Replace with:

```json
    "tabs": {
      "intro": "Introduction",
      "dashboard": "Dashboard",
      "library": "Library",
      "queue": "Queue",
      "profiles": "Profiles",
      "settings": "Settings",
      "cloud": "Cloud",
      "logs": "Logs"
    },
```

- [ ] **Step 2: Add `help.screens.settings.cloud` key**

In `src/i18n/locales/en/common.json`, find:

```json
        "advanced": "Advanced — export/import settings, factory reset",
```

Add after it (still inside `"settings": {`):

```json
        "advanced": "Advanced — export/import settings, factory reset",
        "cloud": "Cloud — manage cloud profiles, credentials, and browse remote files (see Cloud tab)",
```

- [ ] **Step 3: Add `help.screens.cloud` object**

In `src/i18n/locales/en/common.json`, find:

```json
      "logs": {
        "title": "Logs — Diagnostics",
```

Insert immediately before it:

```json
      "cloud": {
        "title": "Cloud — Destinations & File Browser",
        "desc": "Configure cloud storage destinations for automatic file delivery after transcoding. Supported providers: FTP, FTPS, SFTP, SMB, S3 (and compatible: MinIO, Wasabi), and Google Drive.",
        "destinations": {
          "title": "Cloud Destinations",
          "desc": "Add cloud profiles in Settings → Cloud. Each profile stores the connection details for one provider. A job can have multiple cloud destinations — the file is uploaded to all of them automatically after the job completes.",
          "tip1": "iCloud is not supported — Apple does not expose a public file API for third-party apps.",
          "tip2": "Credentials are stored locally on your device. They are never sent to any Nexora server.",
          "tip3": "Google Drive resolves folder names from base_path — it does not use internal folder IDs."
        },
        "browser": {
          "title": "Cloud File Browser",
          "desc": "Click the Browse button (folder icon) on any cloud profile in Settings → Cloud to open the file browser. Navigate into subdirectories, select files, download them to a local folder via the native file dialog, or delete them directly from the remote storage.",
          "tip1": "Select multiple files with the checkboxes on each row, then use Delete Selected or Download Selected.",
          "tip2": "Download opens the native OS file picker so you choose where to save.",
          "tip3": "Delete is permanent — there is no recycle bin on remote storage."
        },
        "upload": {
          "title": "Automatic Upload",
          "desc": "When a transcoding job completes, Nexora automatically uploads the output file to all configured cloud destinations for that job. Uploads use 3 retries with exponential backoff. A failed upload is logged but does not mark the job as failed.",
          "tip1": "Each job can override the default cloud destination set in Settings → Cloud.",
          "tip2": "Upload progress is not shown in the UI — check the Logs tab for upload status.",
          "tip3": "Google Drive upserts files: if a file with the same name exists in the destination folder, it is replaced rather than duplicated."
        }
      },
```

- [ ] **Step 4: Validate JSON**

```bash
node -e "require('./src/i18n/locales/en/common.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en/common.json
git commit -m "i18n(en): adicionar chaves Cloud ao manual (help.screens.cloud.*)"
```

---

## Task 4: I18n — Portuguese (pt)

**Files:**

- Modify: `src/i18n/locales/pt/common.json`

- [ ] **Step 1: Add cloud tab label**

Find `"tabs": {` inside `"help": {`. Add after `"settings": "Definições",`:

```json
        "cloud": "Cloud",
```

- [ ] **Step 2: Add `help.screens.settings.cloud`**

Find `"advanced":` inside `"settings": {` inside `"screens": {`. Add after it:

```json
        "cloud": "Cloud — gerir perfis cloud, credenciais e navegar em ficheiros remotos (ver separador Cloud)",
```

- [ ] **Step 3: Add `help.screens.cloud` object before `"logs": {`**

```json
      "cloud": {
        "title": "Cloud — Destinos e Navegador de Ficheiros",
        "desc": "Configure destinos de armazenamento na cloud para entrega automática de ficheiros após a transcodificação. Fornecedores suportados: FTP, FTPS, SFTP, SMB, S3 (e compatíveis: MinIO, Wasabi) e Google Drive.",
        "destinations": {
          "title": "Destinos Cloud",
          "desc": "Adicione perfis cloud em Definições → Cloud. Cada perfil guarda os detalhes de ligação de um fornecedor. Um job pode ter múltiplos destinos cloud — o ficheiro é enviado para todos automaticamente após o job concluir.",
          "tip1": "O iCloud não é suportado — a Apple não expõe uma API de ficheiros pública para aplicações de terceiros.",
          "tip2": "As credenciais são guardadas localmente no seu dispositivo. Nunca são enviadas para nenhum servidor Nexora.",
          "tip3": "O Google Drive resolve nomes de pastas a partir do base_path — não usa IDs internos de pastas."
        },
        "browser": {
          "title": "Navegador de Ficheiros Cloud",
          "desc": "Clique no botão Navegar (ícone de pasta) em qualquer perfil cloud em Definições → Cloud para abrir o navegador de ficheiros. Navegue para subdirectórios, selecione ficheiros, descarregue-os para uma pasta local através do diálogo de ficheiros nativo, ou apague-os directamente do armazenamento remoto.",
          "tip1": "Selecione múltiplos ficheiros com as caixas de verificação em cada linha, depois use Apagar Seleccionados ou Descarregar Seleccionados.",
          "tip2": "O descarregamento abre o selecionador de ficheiros nativo do SO para escolher onde guardar.",
          "tip3": "O apagamento é permanente — não existe lixo nas pastas remotas."
        },
        "upload": {
          "title": "Upload Automático",
          "desc": "Quando um job de transcodificação conclui, o Nexora envia automaticamente o ficheiro de output para todos os destinos cloud configurados para esse job. Os uploads usam 3 tentativas com recuo exponencial. Um upload falhado é registado mas não marca o job como falhado.",
          "tip1": "Cada job pode substituir o destino cloud predefinido nas Definições → Cloud.",
          "tip2": "O progresso do upload não é mostrado na UI — verifique o separador Registos para o estado do upload.",
          "tip3": "O Google Drive faz upsert de ficheiros: se já existir um ficheiro com o mesmo nome na pasta de destino, é substituído em vez de duplicado."
        }
      },
```

- [ ] **Step 4: Validate JSON**

```bash
node -e "require('./src/i18n/locales/pt/common.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/pt/common.json
git commit -m "i18n(pt): adicionar chaves Cloud ao manual"
```

---

## Task 5: I18n — Remaining 13 Languages

**Files:** `es`, `fr`, `de`, `it`, `ja`, `ko`, `nl`, `pl`, `ru`, `sv`, `tr`, `ar`, `zh` — all in `src/i18n/locales/XX/common.json`

Apply the same three edits to each file (tab label, settings.cloud key, screens.cloud object). Use the translations below.

- [ ] **Step 1: Spanish (es)**

Tab label: `"cloud": "Cloud",`
Settings key: `"cloud": "Cloud — gestionar perfiles cloud, credenciales y explorar archivos remotos (ver pestaña Cloud)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Cloud — Destinos y Explorador de Archivos",
        "desc": "Configure destinos de almacenamiento en la nube para la entrega automática de archivos tras la transcodificación. Proveedores compatibles: FTP, FTPS, SFTP, SMB, S3 (y compatibles: MinIO, Wasabi) y Google Drive.",
        "destinations": {
          "title": "Destinos Cloud",
          "desc": "Añada perfiles cloud en Ajustes → Cloud. Cada perfil almacena los detalles de conexión de un proveedor. Un trabajo puede tener múltiples destinos cloud — el archivo se sube a todos ellos automáticamente cuando el trabajo finaliza.",
          "tip1": "iCloud no es compatible — Apple no expone una API de archivos pública para aplicaciones de terceros.",
          "tip2": "Las credenciales se almacenan localmente en su dispositivo. Nunca se envían a ningún servidor de Nexora.",
          "tip3": "Google Drive resuelve los nombres de carpeta desde base_path — no usa IDs internos de carpetas."
        },
        "browser": {
          "title": "Explorador de Archivos Cloud",
          "desc": "Haga clic en el botón Explorar (icono de carpeta) en cualquier perfil cloud en Ajustes → Cloud para abrir el explorador de archivos. Navegue a subdirectorios, seleccione archivos, descárguelos a una carpeta local mediante el diálogo nativo de archivos, o elimínelos directamente del almacenamiento remoto.",
          "tip1": "Seleccione varios archivos con las casillas de cada fila, luego use Eliminar seleccionados o Descargar seleccionados.",
          "tip2": "La descarga abre el selector de archivos nativo del SO para elegir dónde guardar.",
          "tip3": "La eliminación es permanente — no hay papelera de reciclaje en el almacenamiento remoto."
        },
        "upload": {
          "title": "Subida Automática",
          "desc": "Cuando un trabajo de transcodificación finaliza, Nexora sube automáticamente el archivo de salida a todos los destinos cloud configurados para ese trabajo. Las subidas usan 3 reintentos con retroceso exponencial. Una subida fallida se registra pero no marca el trabajo como fallido.",
          "tip1": "Cada trabajo puede anular el destino cloud predeterminado establecido en Ajustes → Cloud.",
          "tip2": "El progreso de la subida no se muestra en la interfaz — consulte la pestaña Registros para el estado.",
          "tip3": "Google Drive hace upsert de archivos: si ya existe un archivo con el mismo nombre en la carpeta de destino, se reemplaza en lugar de duplicarse."
        }
      },
```

- [ ] **Step 2: French (fr)**

Tab label: `"cloud": "Cloud",`
Settings key: `"cloud": "Cloud — gérer les profils cloud, les identifiants et parcourir les fichiers distants (voir onglet Cloud)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Cloud — Destinations et Explorateur de Fichiers",
        "desc": "Configurez des destinations de stockage cloud pour la livraison automatique des fichiers après le transcodage. Fournisseurs pris en charge : FTP, FTPS, SFTP, SMB, S3 (et compatibles : MinIO, Wasabi) et Google Drive.",
        "destinations": {
          "title": "Destinations Cloud",
          "desc": "Ajoutez des profils cloud dans Paramètres → Cloud. Chaque profil stocke les détails de connexion d'un fournisseur. Un job peut avoir plusieurs destinations cloud — le fichier est envoyé à toutes automatiquement après la fin du job.",
          "tip1": "iCloud n'est pas pris en charge — Apple n'expose pas d'API de fichiers publique pour les applications tierces.",
          "tip2": "Les identifiants sont stockés localement sur votre appareil. Ils ne sont jamais envoyés à un serveur Nexora.",
          "tip3": "Google Drive résout les noms de dossiers depuis base_path — il n'utilise pas d'IDs internes de dossiers."
        },
        "browser": {
          "title": "Explorateur de Fichiers Cloud",
          "desc": "Cliquez sur le bouton Parcourir (icône de dossier) sur n'importe quel profil cloud dans Paramètres → Cloud pour ouvrir l'explorateur de fichiers. Naviguez dans les sous-répertoires, sélectionnez des fichiers, téléchargez-les dans un dossier local via la boîte de dialogue native, ou supprimez-les directement du stockage distant.",
          "tip1": "Sélectionnez plusieurs fichiers avec les cases à cocher de chaque ligne, puis utilisez Supprimer la sélection ou Télécharger la sélection.",
          "tip2": "Le téléchargement ouvre le sélecteur de fichiers natif du système d'exploitation pour choisir où enregistrer.",
          "tip3": "La suppression est permanente — il n'y a pas de corbeille sur le stockage distant."
        },
        "upload": {
          "title": "Envoi Automatique",
          "desc": "Lorsqu'un job de transcodage se termine, Nexora envoie automatiquement le fichier de sortie vers toutes les destinations cloud configurées pour ce job. Les envois utilisent 3 tentatives avec recul exponentiel. Un envoi échoué est enregistré mais ne marque pas le job comme échoué.",
          "tip1": "Chaque job peut remplacer la destination cloud par défaut définie dans Paramètres → Cloud.",
          "tip2": "La progression de l'envoi n'est pas affichée dans l'interface — consultez l'onglet Journaux pour l'état.",
          "tip3": "Google Drive effectue un upsert des fichiers : si un fichier avec le même nom existe déjà dans le dossier de destination, il est remplacé plutôt que dupliqué."
        }
      },
```

- [ ] **Step 3: German (de)**

Tab label: `"cloud": "Cloud",`
Settings key: `"cloud": "Cloud — Cloud-Profile, Anmeldedaten verwalten und Remote-Dateien durchsuchen (siehe Cloud-Registerkarte)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Cloud — Ziele und Datei-Browser",
        "desc": "Konfigurieren Sie Cloud-Speicherziele für die automatische Dateiauslieferung nach dem Transcodieren. Unterstützte Anbieter: FTP, FTPS, SFTP, SMB, S3 (und kompatibel: MinIO, Wasabi) und Google Drive.",
        "destinations": {
          "title": "Cloud-Ziele",
          "desc": "Fügen Sie Cloud-Profile unter Einstellungen → Cloud hinzu. Jedes Profil speichert die Verbindungsdetails eines Anbieters. Ein Job kann mehrere Cloud-Ziele haben — die Datei wird nach Abschluss automatisch an alle hochgeladen.",
          "tip1": "iCloud wird nicht unterstützt — Apple stellt keine öffentliche Datei-API für Drittanbieter-Apps bereit.",
          "tip2": "Anmeldedaten werden lokal auf Ihrem Gerät gespeichert. Sie werden nie an einen Nexora-Server gesendet.",
          "tip3": "Google Drive löst Ordnernamen aus base_path auf — es verwendet keine internen Ordner-IDs."
        },
        "browser": {
          "title": "Cloud-Datei-Browser",
          "desc": "Klicken Sie auf die Schaltfläche Durchsuchen (Ordner-Symbol) bei einem Cloud-Profil unter Einstellungen → Cloud, um den Datei-Browser zu öffnen. Navigieren Sie in Unterverzeichnisse, wählen Sie Dateien aus, laden Sie sie herunter oder löschen Sie sie direkt aus dem Remote-Speicher.",
          "tip1": "Wählen Sie mehrere Dateien mit den Kontrollkästchen jeder Zeile aus und verwenden Sie dann Auswahl löschen oder Auswahl herunterladen.",
          "tip2": "Der Download öffnet den nativen Dateiauswähler des Betriebssystems zum Wählen des Speicherorts.",
          "tip3": "Das Löschen ist dauerhaft — im Remote-Speicher gibt es keinen Papierkorb."
        },
        "upload": {
          "title": "Automatischer Upload",
          "desc": "Wenn ein Transcodier-Job abgeschlossen ist, lädt Nexora die Ausgabedatei automatisch auf alle konfigurierten Cloud-Ziele hoch. Uploads verwenden 3 Versuche mit exponentiellem Backoff. Ein fehlgeschlagener Upload wird protokolliert, markiert den Job aber nicht als fehlgeschlagen.",
          "tip1": "Jeder Job kann das Standard-Cloud-Ziel unter Einstellungen → Cloud überschreiben.",
          "tip2": "Der Upload-Fortschritt wird nicht in der Benutzeroberfläche angezeigt — überprüfen Sie die Registerkarte Protokolle.",
          "tip3": "Google Drive führt einen Upsert durch: Wenn bereits eine Datei mit demselben Namen im Zielordner vorhanden ist, wird sie ersetzt statt dupliziert."
        }
      },
```

- [ ] **Step 4: Italian (it)**

Tab label: `"cloud": "Cloud",`
Settings key: `"cloud": "Cloud — gestisci profili cloud, credenziali e sfoglia file remoti (vedi scheda Cloud)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Cloud — Destinazioni e Browser di File",
        "desc": "Configura destinazioni di archiviazione cloud per la consegna automatica dei file dopo la transcodifica. Provider supportati: FTP, FTPS, SFTP, SMB, S3 (e compatibili: MinIO, Wasabi) e Google Drive.",
        "destinations": {
          "title": "Destinazioni Cloud",
          "desc": "Aggiungi profili cloud in Impostazioni → Cloud. Ogni profilo memorizza i dettagli di connessione di un provider. Un job può avere più destinazioni cloud — il file viene caricato su tutte automaticamente dopo il completamento.",
          "tip1": "iCloud non è supportato — Apple non espone un'API di file pubblica per app di terze parti.",
          "tip2": "Le credenziali vengono memorizzate localmente sul dispositivo. Non vengono mai inviate a nessun server Nexora.",
          "tip3": "Google Drive risolve i nomi delle cartelle da base_path — non usa ID interni delle cartelle."
        },
        "browser": {
          "title": "Browser di File Cloud",
          "desc": "Fai clic sul pulsante Sfoglia (icona cartella) su qualsiasi profilo cloud in Impostazioni → Cloud per aprire il browser di file. Naviga nelle sottodirectory, seleziona i file, scaricali o eliminali direttamente dall'archiviazione remota.",
          "tip1": "Seleziona più file con le caselle di controllo di ogni riga, quindi usa Elimina selezionati o Scarica selezionati.",
          "tip2": "Il download apre il selettore di file nativo del sistema operativo per scegliere dove salvare.",
          "tip3": "L'eliminazione è permanente — non c'è cestino nell'archiviazione remota."
        },
        "upload": {
          "title": "Caricamento Automatico",
          "desc": "Quando un job di transcodifica è completato, Nexora carica automaticamente il file di output su tutte le destinazioni cloud configurate. I caricamenti usano 3 tentativi con backoff esponenziale. Un caricamento fallito viene registrato ma non segna il job come fallito.",
          "tip1": "Ogni job può sovrascrivere la destinazione cloud predefinita impostata in Impostazioni → Cloud.",
          "tip2": "Il progresso del caricamento non è mostrato nell'interfaccia — controlla la scheda Log per lo stato.",
          "tip3": "Google Drive fa l'upsert dei file: se esiste già un file con lo stesso nome nella cartella di destinazione, viene sostituito invece di duplicato."
        }
      },
```

- [ ] **Step 5: Japanese (ja)**

Tab label: `"cloud": "クラウド",`
Settings key: `"cloud": "クラウド — クラウドプロファイルや認証情報の管理とリモートファイルの参照（クラウドタブを参照）",`

screens.cloud object:

```json
      "cloud": {
        "title": "クラウド — 配信先とファイルブラウザ",
        "desc": "トランスコード後のファイル自動配信のためのクラウドストレージ配信先を設定します。対応プロバイダー：FTP、FTPS、SFTP、SMB、S3（およびMinIO、Wasabi等互換）、Google Drive。",
        "destinations": {
          "title": "クラウド配信先",
          "desc": "設定 → クラウドでクラウドプロファイルを追加します。各プロファイルはプロバイダーの接続情報を保存します。1つのジョブに複数のクラウド配信先を設定できます — ジョブ完了後、ファイルはすべての配信先に自動的にアップロードされます。",
          "tip1": "iCloudは非対応です — Appleはサードパーティアプリ向けの公開ファイルAPIを提供していません。",
          "tip2": "認証情報はデバイスにローカル保存されます。Nexoraのサーバーには送信されません。",
          "tip3": "Google DriveはフォルダーIDではなく、base_pathのフォルダー名で解決します。"
        },
        "browser": {
          "title": "クラウドファイルブラウザ",
          "desc": "設定 → クラウドの任意のクラウドプロファイルにある参照ボタン（フォルダーアイコン）をクリックしてファイルブラウザを開きます。サブディレクトリを移動し、ファイルを選択して、ネイティブダイアログでダウンロードしたり、リモートストレージから直接削除したりできます。",
          "tip1": "各行のチェックボックスで複数ファイルを選択し、選択削除または選択ダウンロードを使用します。",
          "tip2": "ダウンロードは保存先を選択するためのOSネイティブファイルピッカーを開きます。",
          "tip3": "削除は永続的です — リモートストレージにはごみ箱がありません。"
        },
        "upload": {
          "title": "自動アップロード",
          "desc": "トランスコードジョブが完了すると、Nexoraはそのジョブに設定されたすべてのクラウド配信先に出力ファイルを自動的にアップロードします。アップロードは指数バックオフで3回リトライします。失敗したアップロードはログに記録されますが、ジョブを失敗とはしません。",
          "tip1": "各ジョブは設定 → クラウドで設定したデフォルトのクラウド配信先を上書きできます。",
          "tip2": "アップロードの進行状況はUIに表示されません — ログタブでアップロードの状態を確認してください。",
          "tip3": "Google Driveはファイルをアップサートします：配信先フォルダーに同名のファイルが存在する場合、重複せずに置き換えられます。"
        }
      },
```

- [ ] **Step 6: Korean (ko)**

Tab label: `"cloud": "클라우드",`
Settings key: `"cloud": "클라우드 — 클라우드 프로파일, 자격 증명 관리 및 원격 파일 찾아보기(클라우드 탭 참조)",`

screens.cloud object:

```json
      "cloud": {
        "title": "클라우드 — 목적지 및 파일 브라우저",
        "desc": "트랜스코딩 후 자동 파일 전달을 위한 클라우드 스토리지 목적지를 설정합니다. 지원 공급자: FTP, FTPS, SFTP, SMB, S3(및 호환: MinIO, Wasabi), Google Drive.",
        "destinations": {
          "title": "클라우드 목적지",
          "desc": "설정 → 클라우드에서 클라우드 프로파일을 추가합니다. 각 프로파일은 공급자의 연결 정보를 저장합니다. 하나의 작업에 여러 클라우드 목적지를 설정할 수 있습니다 — 작업 완료 후 파일이 모든 목적지에 자동으로 업로드됩니다.",
          "tip1": "iCloud는 지원되지 않습니다 — Apple은 타사 앱에 공개 파일 API를 제공하지 않습니다.",
          "tip2": "자격 증명은 기기에 로컬로 저장됩니다. Nexora 서버로 전송되지 않습니다.",
          "tip3": "Google Drive는 내부 폴더 ID가 아닌 base_path의 폴더 이름으로 해석합니다."
        },
        "browser": {
          "title": "클라우드 파일 브라우저",
          "desc": "설정 → 클라우드의 클라우드 프로파일에서 찾아보기 버튼(폴더 아이콘)을 클릭하여 파일 브라우저를 엽니다. 하위 디렉터리로 이동하고, 파일을 선택하고, 기본 파일 대화 상자를 통해 다운로드하거나 원격 스토리지에서 직접 삭제합니다.",
          "tip1": "각 행의 확인란으로 여러 파일을 선택한 다음 선택 항목 삭제 또는 선택 항목 다운로드를 사용합니다.",
          "tip2": "다운로드는 저장 위치를 선택하는 OS 기본 파일 선택기를 엽니다.",
          "tip3": "삭제는 영구적입니다 — 원격 스토리지에는 휴지통이 없습니다."
        },
        "upload": {
          "title": "자동 업로드",
          "desc": "트랜스코딩 작업이 완료되면 Nexora가 해당 작업에 구성된 모든 클라우드 목적지로 출력 파일을 자동으로 업로드합니다. 업로드는 지수 백오프로 3번 재시도합니다. 실패한 업로드는 기록되지만 작업을 실패로 표시하지 않습니다.",
          "tip1": "각 작업은 설정 → 클라우드에 설정된 기본 클라우드 목적지를 재정의할 수 있습니다.",
          "tip2": "업로드 진행 상황은 UI에 표시되지 않습니다 — 업로드 상태는 로그 탭을 확인하세요.",
          "tip3": "Google Drive는 파일을 업서트합니다: 목적지 폴더에 같은 이름의 파일이 이미 있으면 중복되지 않고 교체됩니다."
        }
      },
```

- [ ] **Step 7: Dutch (nl)**

Tab label: `"cloud": "Cloud",`
Settings key: `"cloud": "Cloud — beheer cloudprofielen, inloggegevens en blader door externe bestanden (zie tabblad Cloud)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Cloud — Bestemmingen en bestandsbeheer",
        "desc": "Configureer cloudopslagbestemmingen voor automatische bestandslevering na transcodering. Ondersteunde aanbieders: FTP, FTPS, SFTP, SMB, S3 (en compatibel: MinIO, Wasabi) en Google Drive.",
        "destinations": {
          "title": "Cloudbestemmingen",
          "desc": "Voeg cloudprofielen toe via Instellingen → Cloud. Elk profiel slaat de verbindingsgegevens van een aanbieder op. Een taak kan meerdere cloudbestemmingen hebben — het bestand wordt automatisch naar alle bestemmingen geüpload nadat de taak is voltooid.",
          "tip1": "iCloud wordt niet ondersteund — Apple biedt geen openbare bestands-API voor apps van derden.",
          "tip2": "Inloggegevens worden lokaal op uw apparaat opgeslagen. Ze worden nooit naar een Nexora-server gestuurd.",
          "tip3": "Google Drive lost mapnamen op via base_path — het gebruikt geen interne map-ID's."
        },
        "browser": {
          "title": "Cloudbestandsbeheer",
          "desc": "Klik op de knop Bladeren (mappictogram) bij een cloudprofiel in Instellingen → Cloud om de bestandsbeheerder te openen. Navigeer naar submappen, selecteer bestanden, download ze of verwijder ze rechtstreeks uit de externe opslag.",
          "tip1": "Selecteer meerdere bestanden met de selectievakjes in elke rij en gebruik vervolgens Geselecteerde verwijderen of Geselecteerde downloaden.",
          "tip2": "Downloaden opent de native bestandskiezer van het besturingssysteem om te kiezen waar u wilt opslaan.",
          "tip3": "Verwijderen is permanent — er is geen prullenbak in externe opslag."
        },
        "upload": {
          "title": "Automatisch uploaden",
          "desc": "Wanneer een transcoderingstranstaak is voltooid, uploadt Nexora het uitvoerbestand automatisch naar alle geconfigureerde cloudbestemmingen. Uploads gebruiken 3 pogingen met exponentiële backoff. Een mislukte upload wordt geregistreerd maar markeert de taak niet als mislukt.",
          "tip1": "Elke taak kan de standaard cloudbestemming die is ingesteld in Instellingen → Cloud overschrijven.",
          "tip2": "De uploadvoortgang wordt niet weergegeven in de interface — controleer het tabblad Logboeken voor de uploadstatus.",
          "tip3": "Google Drive doet een upsert van bestanden: als er al een bestand met dezelfde naam bestaat in de doelmap, wordt het vervangen in plaats van gedupliceerd."
        }
      },
```

- [ ] **Step 8: Polish (pl)**

Tab label: `"cloud": "Chmura",`
Settings key: `"cloud": "Chmura — zarządzaj profilami chmury, danymi logowania i przeglądaj zdalne pliki (patrz karta Chmura)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Chmura — miejsca docelowe i przeglądarka plików",
        "desc": "Skonfiguruj miejsca docelowe przechowywania w chmurze do automatycznego dostarczania plików po transkodowaniu. Obsługiwane dostawcy: FTP, FTPS, SFTP, SMB, S3 (i kompatybilne: MinIO, Wasabi) i Google Drive.",
        "destinations": {
          "title": "Miejsca docelowe w chmurze",
          "desc": "Dodaj profile chmury w Ustawienia → Chmura. Każdy profil przechowuje dane połączenia dla jednego dostawcy. Zadanie może mieć wiele miejsc docelowych — plik jest przesyłany do wszystkich automatycznie po zakończeniu zadania.",
          "tip1": "iCloud nie jest obsługiwany — Apple nie udostępnia publicznego API plików dla aplikacji innych firm.",
          "tip2": "Dane logowania są przechowywane lokalnie na urządzeniu. Nigdy nie są wysyłane na żaden serwer Nexora.",
          "tip3": "Google Drive rozwiązuje nazwy folderów z base_path — nie używa wewnętrznych identyfikatorów folderów."
        },
        "browser": {
          "title": "Przeglądarka plików w chmurze",
          "desc": "Kliknij przycisk Przeglądaj (ikona folderu) przy dowolnym profilu chmury w Ustawienia → Chmura, aby otworzyć przeglądarkę plików. Przejdź do podkatalogów, wybierz pliki, pobierz je lub usuń bezpośrednio ze zdalnego magazynu.",
          "tip1": "Wybierz wiele plików za pomocą pól wyboru w każdym wierszu, a następnie użyj opcji Usuń zaznaczone lub Pobierz zaznaczone.",
          "tip2": "Pobieranie otwiera natywny selektor plików systemu operacyjnego, aby wybrać miejsce zapisania.",
          "tip3": "Usuwanie jest trwałe — w zdalnym magazynie nie ma kosza."
        },
        "upload": {
          "title": "Automatyczne przesyłanie",
          "desc": "Po zakończeniu zadania transkodowania Nexora automatycznie przesyła plik wyjściowy do wszystkich skonfigurowanych miejsc docelowych w chmurze. Przesyłanie używa 3 ponownych prób z wykładniczym cofaniem. Nieudane przesyłanie jest rejestrowane, ale nie oznacza zadania jako nieudanego.",
          "tip1": "Każde zadanie może zastąpić domyślne miejsce docelowe w chmurze ustawione w Ustawienia → Chmura.",
          "tip2": "Postęp przesyłania nie jest wyświetlany w interfejsie — sprawdź kartę Dzienniki pod kątem stanu przesyłania.",
          "tip3": "Google Drive wykonuje upsert plików: jeśli plik o tej samej nazwie już istnieje w folderze docelowym, zostaje zastąpiony, a nie zduplikowany."
        }
      },
```

- [ ] **Step 9: Russian (ru)**

Tab label: `"cloud": "Облако",`
Settings key: `"cloud": "Облако — управление облачными профилями, учётными данными и просмотр удалённых файлов (см. вкладку Облако)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Облако — назначения и браузер файлов",
        "desc": "Настройте облачные хранилища для автоматической доставки файлов после транскодирования. Поддерживаемые провайдеры: FTP, FTPS, SFTP, SMB, S3 (и совместимые: MinIO, Wasabi) и Google Drive.",
        "destinations": {
          "title": "Облачные назначения",
          "desc": "Добавьте облачные профили в Настройки → Облако. Каждый профиль хранит данные подключения одного провайдера. Задание может иметь несколько облачных назначений — файл загружается во все из них автоматически после завершения задания.",
          "tip1": "iCloud не поддерживается — Apple не предоставляет публичный файловый API для сторонних приложений.",
          "tip2": "Учётные данные хранятся локально на вашем устройстве. Они никогда не отправляются на серверы Nexora.",
          "tip3": "Google Drive разрешает имена папок из base_path — он не использует внутренние идентификаторы папок."
        },
        "browser": {
          "title": "Облачный браузер файлов",
          "desc": "Нажмите кнопку «Обзор» (значок папки) на любом облачном профиле в Настройки → Облако, чтобы открыть браузер файлов. Перейдите в подкаталоги, выберите файлы, загрузите их или удалите прямо из удалённого хранилища.",
          "tip1": "Выберите несколько файлов с помощью флажков в каждой строке, затем используйте «Удалить выбранные» или «Загрузить выбранные».",
          "tip2": "Загрузка открывает стандартный выбор файлов ОС для выбора места сохранения.",
          "tip3": "Удаление постоянное — в удалённом хранилище нет корзины."
        },
        "upload": {
          "title": "Автоматическая загрузка",
          "desc": "Когда задание транскодирования завершается, Nexora автоматически загружает выходной файл во все настроенные облачные назначения. Загрузки используют 3 попытки с экспоненциальной выдержкой. Неудавшаяся загрузка регистрируется, но не отмечает задание как неудавшееся.",
          "tip1": "Каждое задание может переопределить облачное назначение по умолчанию, установленное в Настройки → Облако.",
          "tip2": "Прогресс загрузки не отображается в интерфейсе — проверьте вкладку «Журналы» для статуса загрузки.",
          "tip3": "Google Drive выполняет upsert файлов: если файл с тем же именем уже существует в папке назначения, он заменяется, а не дублируется."
        }
      },
```

- [ ] **Step 10: Swedish (sv)**

Tab label: `"cloud": "Moln",`
Settings key: `"cloud": "Moln — hantera molnprofiler, inloggningsuppgifter och bläddra bland fjärrfiler (se fliken Moln)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Moln — destinationer och filbläddrare",
        "desc": "Konfigurera molnlagringsdestinationer för automatisk filleverans efter transkodning. Leverantörer som stöds: FTP, FTPS, SFTP, SMB, S3 (och kompatibla: MinIO, Wasabi) och Google Drive.",
        "destinations": {
          "title": "Molndestinationer",
          "desc": "Lägg till molnprofiler i Inställningar → Moln. Varje profil lagrar anslutningsinformation för en leverantör. Ett jobb kan ha flera molndestinationer — filen laddas automatiskt upp till alla när jobbet slutförs.",
          "tip1": "iCloud stöds inte — Apple exponerar inget offentligt fil-API för tredjepartsappar.",
          "tip2": "Inloggningsuppgifter lagras lokalt på din enhet. De skickas aldrig till någon Nexora-server.",
          "tip3": "Google Drive löser mappnamn från base_path — det använder inte interna mapp-ID:n."
        },
        "browser": {
          "title": "Molnfilbläddrare",
          "desc": "Klicka på knappen Bläddra (mappikon) på valfri molnprofil i Inställningar → Moln för att öppna filbläddraren. Navigera till underkataloger, välj filer, ladda ned dem eller ta bort dem direkt från fjärrlagringen.",
          "tip1": "Välj flera filer med kryssrutorna på varje rad och använd sedan Ta bort markerade eller Ladda ned markerade.",
          "tip2": "Nedladdning öppnar operativsystemets inbyggda filväljare för att välja var du vill spara.",
          "tip3": "Borttagning är permanent — det finns inget papperskorg i fjärrlagringen."
        },
        "upload": {
          "title": "Automatisk uppladdning",
          "desc": "När ett transkodningsjobb slutförs laddar Nexora automatiskt upp utdatafilen till alla konfigurerade molndestinationer. Uppladdningar använder 3 försök med exponentiell backoff. En misslyckad uppladdning loggas men markerar inte jobbet som misslyckat.",
          "tip1": "Varje jobb kan åsidosätta standardmolndestinationen som anges i Inställningar → Moln.",
          "tip2": "Uppladdningsförloppet visas inte i gränssnittet — kontrollera fliken Loggar för uppladdningsstatus.",
          "tip3": "Google Drive uppsertar filer: om en fil med samma namn redan finns i målmappen ersätts den i stället för att dupliceras."
        }
      },
```

- [ ] **Step 11: Turkish (tr)**

Tab label: `"cloud": "Bulut",`
Settings key: `"cloud": "Bulut — bulut profillerini ve kimlik bilgilerini yönetin ve uzak dosyalara göz atın (Bulut sekmesine bakın)",`

screens.cloud object:

```json
      "cloud": {
        "title": "Bulut — Hedefler ve Dosya Tarayıcısı",
        "desc": "Kodlama sonrası otomatik dosya teslimi için bulut depolama hedefleri yapılandırın. Desteklenen sağlayıcılar: FTP, FTPS, SFTP, SMB, S3 (ve uyumlu: MinIO, Wasabi) ve Google Drive.",
        "destinations": {
          "title": "Bulut Hedefleri",
          "desc": "Ayarlar → Bulut'ta bulut profilleri ekleyin. Her profil bir sağlayıcının bağlantı ayrıntılarını depolar. Bir iş birden fazla bulut hedefine sahip olabilir — iş tamamlandıktan sonra dosya tüm hedeflere otomatik olarak yüklenir.",
          "tip1": "iCloud desteklenmemektedir — Apple üçüncü taraf uygulamalar için genel bir dosya API'si sunmamaktadır.",
          "tip2": "Kimlik bilgileri cihazınızda yerel olarak depolanır. Hiçbir zaman herhangi bir Nexora sunucusuna gönderilmez.",
          "tip3": "Google Drive, klasör adlarını base_path'ten çözer — dahili klasör kimliklerini kullanmaz."
        },
        "browser": {
          "title": "Bulut Dosya Tarayıcısı",
          "desc": "Dosya tarayıcısını açmak için Ayarlar → Bulut'taki herhangi bir bulut profilindeki Gözat düğmesine (klasör simgesi) tıklayın. Alt dizinlere gidin, dosya seçin, yerel bir klasöre indirin veya doğrudan uzak depolamadan silin.",
          "tip1": "Her satırdaki onay kutularıyla birden fazla dosya seçin, ardından Seçilenleri Sil veya Seçilenleri İndir seçeneğini kullanın.",
          "tip2": "İndirme, nereye kaydedileceğini seçmek için işletim sisteminin yerel dosya seçiciyi açar.",
          "tip3": "Silme kalıcıdır — uzak depolamada geri dönüşüm kutusu yoktur."
        },
        "upload": {
          "title": "Otomatik Yükleme",
          "desc": "Bir kodlama işi tamamlandığında, Nexora çıktı dosyasını o iş için yapılandırılmış tüm bulut hedeflerine otomatik olarak yükler. Yüklemeler üstel geri çekilme ile 3 yeniden deneme kullanır. Başarısız bir yükleme günlüğe kaydedilir ancak işi başarısız olarak işaretlemez.",
          "tip1": "Her iş, Ayarlar → Bulut'ta ayarlanan varsayılan bulut hedefini geçersiz kılabilir.",
          "tip2": "Yükleme ilerleme durumu arayüzde gösterilmez — yükleme durumu için Günlükler sekmesini kontrol edin.",
          "tip3": "Google Drive dosyaları upsert eder: hedef klasörde aynı ada sahip bir dosya zaten mevcutsa, kopyalanmak yerine değiştirilir."
        }
      },
```

- [ ] **Step 12: Arabic (ar)**

Tab label: `"cloud": "السحابة",`
Settings key: `"cloud": "السحابة — إدارة ملفات تعريف السحابة وبيانات الاعتماد وتصفح الملفات البعيدة (انظر علامة تبويب السحابة)",`

screens.cloud object:

```json
      "cloud": {
        "title": "السحابة — الوجهات ومتصفح الملفات",
        "desc": "قم بتكوين وجهات التخزين السحابي للتسليم التلقائي للملفات بعد الترميز. الموفرون المدعومون: FTP وFTPS وSFTP وSMB وS3 (والمتوافقون: MinIO وWasabi) وGoogle Drive.",
        "destinations": {
          "title": "وجهات السحابة",
          "desc": "أضف ملفات تعريف السحابة في الإعدادات → السحابة. يخزن كل ملف تعريف تفاصيل اتصال موفر واحد. يمكن أن يكون للمهمة وجهات سحابية متعددة — يتم تحميل الملف إليها جميعًا تلقائيًا بعد اكتمال المهمة.",
          "tip1": "iCloud غير مدعوم — لا تكشف Apple عن واجهة برمجة تطبيقات ملفات عامة لتطبيقات الجهات الخارجية.",
          "tip2": "تُخزَّن بيانات الاعتماد محليًا على جهازك. لا تُرسَل أبدًا إلى أي خادم Nexora.",
          "tip3": "يحل Google Drive أسماء المجلدات من base_path — ولا يستخدم معرفات المجلدات الداخلية."
        },
        "browser": {
          "title": "متصفح ملفات السحابة",
          "desc": "انقر على زر تصفح (أيقونة المجلد) في أي ملف تعريف سحابي في الإعدادات → السحابة لفتح متصفح الملفات. انتقل إلى الدلائل الفرعية، وحدد الملفات، وقم بتنزيلها أو احذفها مباشرة من التخزين البعيد.",
          "tip1": "حدد ملفات متعددة باستخدام مربعات الاختيار في كل صف، ثم استخدم حذف المحدد أو تنزيل المحدد.",
          "tip2": "يفتح التنزيل منتقي الملفات الأصلي لنظام التشغيل لاختيار مكان الحفظ.",
          "tip3": "الحذف دائم — لا توجد سلة مهملات في التخزين البعيد."
        },
        "upload": {
          "title": "الرفع التلقائي",
          "desc": "عند اكتمال مهمة الترميز، يقوم Nexora تلقائيًا برفع ملف الإخراج إلى جميع وجهات السحابة المكوَّنة لتلك المهمة. تستخدم عمليات الرفع 3 محاولات إعادة مع تراجع أسي. يتم تسجيل عملية الرفع الفاشلة لكنها لا تضع علامة على المهمة بوصفها فاشلة.",
          "tip1": "يمكن لكل مهمة تجاوز وجهة السحابة الافتراضية المعيَّنة في الإعدادات → السحابة.",
          "tip2": "لا يظهر تقدم الرفع في واجهة المستخدم — راجع علامة تبويب السجلات للاطلاع على حالة الرفع.",
          "tip3": "يقوم Google Drive بعملية upsert للملفات: إذا كان ملف بنفس الاسم موجودًا بالفعل في مجلد الوجهة، فسيتم استبداله بدلًا من تكراره."
        }
      },
```

- [ ] **Step 13: Chinese (zh)**

Tab label: `"cloud": "云端",`
Settings key: `"cloud": "云端——管理云端配置文件、凭据并浏览远程文件（请参见云端选项卡）",`

screens.cloud object:

```json
      "cloud": {
        "title": "云端 — 目标与文件浏览器",
        "desc": "配置云存储目标，以便在转码后自动交付文件。支持的提供商：FTP、FTPS、SFTP、SMB、S3（及兼容：MinIO、Wasabi）和 Google Drive。",
        "destinations": {
          "title": "云端目标",
          "desc": "在设置 → 云端中添加云端配置文件。每个配置文件存储一个提供商的连接详细信息。一个任务可以有多个云端目标——任务完成后，文件将自动上传到所有目标。",
          "tip1": "不支持 iCloud——Apple 不为第三方应用程序公开文件 API。",
          "tip2": "凭据存储在您的设备本地。永远不会发送到任何 Nexora 服务器。",
          "tip3": "Google Drive 从 base_path 解析文件夹名称——不使用内部文件夹 ID。"
        },
        "browser": {
          "title": "云端文件浏览器",
          "desc": "单击设置 → 云端中任意云端配置文件上的浏览按钮（文件夹图标）以打开文件浏览器。导航到子目录，选择文件，通过本机文件对话框将其下载到本地文件夹，或直接从远程存储中删除它们。",
          "tip1": "使用每行的复选框选择多个文件，然后使用删除所选或下载所选。",
          "tip2": "下载会打开操作系统的本机文件选择器以选择保存位置。",
          "tip3": "删除是永久性的——远程存储中没有回收站。"
        },
        "upload": {
          "title": "自动上传",
          "desc": "转码任务完成后，Nexora 自动将输出文件上传到该任务配置的所有云端目标。上传使用指数退避进行 3 次重试。失败的上传会被记录，但不会将任务标记为失败。",
          "tip1": "每个任务可以覆盖在设置 → 云端中设置的默认云端目标。",
          "tip2": "上传进度不在界面中显示——请检查日志选项卡以了解上传状态。",
          "tip3": "Google Drive 对文件执行 upsert 操作：如果目标文件夹中已存在同名文件，则替换而不是复制。"
        }
      },
```

- [ ] **Step 14: Validate all 13 language files**

```bash
for lang in es fr de it ja ko nl pl ru sv tr ar zh; do
  node -e "require('./src/i18n/locales/$lang/common.json'); console.log('$lang OK')"
done
```

Expected: 13 lines each ending with `OK`

- [ ] **Step 15: Run full typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 16: Commit**

```bash
git add src/i18n/locales/
git commit -m "i18n(all): adicionar chaves Cloud ao manual em 15 línguas"
```

---

## Final Verification

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Push to remote**

```bash
git push origin main
```

Expected: push succeeds, CI triggers.
