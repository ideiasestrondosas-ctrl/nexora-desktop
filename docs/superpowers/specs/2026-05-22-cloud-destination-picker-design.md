# Cloud Destination Picker no BatchSubmitModal

**Data:** 2026-05-22  
**Estado:** Aprovado  
**Área:** `src/components/BatchSubmitModal.tsx`

---

## Contexto

O Nexora Desktop permite configurar perfis cloud (S3, GDrive, FTP, SFTP, SMB, iCloud) em Definições. Esses perfis já são usados pelo `IngestProfileModal` (modal de fallback para extensões inválidas) e pelo backend que faz upload automático após o job terminar.

O `BatchSubmitModal` — o modal principal, aberto por drag-and-drop ou selecção de ficheiros — não expõe esta opção. O utilizador não tem forma de escolher o destino cloud ao submeter um batch pela via principal.

O backend já suporta tudo: `submit_job` aceita `cloud_profile_ids`, a tabela `job_cloud_destinations` existe e o upload automático está implementado.

---

## Objectivo

Expor a escolha de destino cloud no `BatchSubmitModal`, com:

- Um **picker global** (padrão para todos os ficheiros do batch)
- Um **override por ficheiro** (a linha expande inline para escolha individual)
- Um **CTA** quando não há perfis configurados

---

## Design

### Granularidade

**Global + override por ficheiro.** O utilizador define um destino que se aplica a todos os ficheiros. Cada ficheiro pode ter um override diferente, activado expandindo a sua linha na tabela.

### UX do override

**Linha expande inline.** Clicar no botão de destino de um ficheiro expande essa linha para baixo, mostrando os perfis disponíveis como botões toggle. Fechar: clicar novamente no botão ou expandir outra linha. Só uma linha pode estar expandida de cada vez.

### Estado sem perfis configurados

**CTA "Adicionar perfil cloud →"** que navega para as Definições no tab Cloud, usando o mesmo mecanismo de navegação já usado noutros pontos da app (verificar padrão existente em `SettingsPage` ou `IngestProfileModal`). A coluna "Destino" não aparece na tabela quando não há perfis.

---

## Layout do modal

```
BatchSubmitModal
├── Header (existente): título + contador de ficheiros
├── Campos globais (existentes): pasta de saída · perfil de transcoding
├── [NOVO] Secção cloud
│   ├── SE profiles.length > 0:
│   │   ├── Título "Destino cloud após processamento"
│   │   ├── Subtítulo "padrão para todos · override por ficheiro abaixo"
│   │   └── CloudDestinationPicker (selectedIds=globalCloudIds, onChange=setGlobalCloudIds)
│   └── SE profiles.length === 0:
│       └── "Sem perfis cloud configurados. [+ Adicionar perfil cloud →]"
├── Tabela de ficheiros
│   ├── Colunas: Ficheiro | Perfil | Estimativa | [Destino — só se profiles.length > 0]
│   └── Por linha:
│       ├── Estado normal: botão "💾 Local" (cinzento) ou "☁️ Nome" (azul=global / amarelo=override)
│       └── Estado expandido:
│           ├── Label "Override para este ficheiro"
│           └── Botões: "💾 Local" · um por cada perfil cloud
└── Footer (existente): Cancelar · Processar Tudo
```

**Código visual dos botões de destino por linha:**

| Cor      | Significado                            |
| -------- | -------------------------------------- |
| Cinzento | Local — sem cloud (global ou override) |
| Azul     | Herda destino do picker global         |
| Amarelo  | Override activo — diferente do global  |

---

## Estado local do modal

```ts
// Adicionado ao estado existente do BatchSubmitModal
const [globalCloudIds, setGlobalCloudIds] = useState<string[]>([]);
const [perFileOverrides, setPerFileOverrides] = useState<Record<string, string[]>>({});
const [expandedRow, setExpandedRow] = useState<string | null>(null);
```

`perFileOverrides[path]` só existe se o utilizador expandiu e escolheu explicitamente. `undefined` significa "herda o global".

**Semântica dos valores:**

| `perFileOverrides[path]` | Resultado                                          |
| ------------------------ | -------------------------------------------------- |
| `undefined`              | Herda `globalCloudIds`                             |
| `[]`                     | Local (sem cloud), mesmo que o global tenha perfis |
| `['id-s3']`              | Vai para S3, independentemente do global           |

---

## Fluxo de submissão

```ts
for (const row of rows) {
  const cloudIds = perFileOverrides[row.path] ?? globalCloudIds;
  const asset = await invoke('ingest_asset', { path: row.path });
  await invoke('submit_job', {
    assetId: asset.id,
    profile: row.profileId,
    priority: 0,
    cloudProfileIds: cloudIds,
  });
}
```

Sem alterações ao backend. `submit_job` já aceita `cloudProfileIds`.

---

## Componentes afectados

| Ficheiro                                    | Alteração                                          |
| ------------------------------------------- | -------------------------------------------------- |
| `src/components/BatchSubmitModal.tsx`       | Adiciona secção cloud + estado + expansão de linha |
| `src/components/CloudDestinationPicker.tsx` | Reutilizado sem alterações                         |
| `src/store/cloud.ts`                        | Leitura de `profiles` — sem alterações             |
| `src-tauri/src/commands/jobs.rs`            | Sem alterações                                     |
| `src/components/IngestProfileModal.tsx`     | Sem alterações                                     |

---

## Casos extremos

| Situação                                        | Comportamento                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Perfis carregam devagar                         | `cloudStore.profiles` é Zustand síncrono — sem loading state necessário |
| Perfil removido nas Definições com modal aberto | Zustand é reactivo — o picker actualiza; perfil desaparece da selecção  |
| Uma linha expandida + clica noutra              | A anterior fecha automaticamente                                        |
| Batch com 1 ficheiro                            | Funciona igual                                                          |
| `submit_job` falha a meio do batch              | Comportamento existente não alterado                                    |

---

## O que fica deliberadamente de fora

- **Persistência da escolha entre sessões** (`localStorage`) — pode ser adicionado depois com ~10 linhas
- **Multi-destino no override por ficheiro** — o picker global já suporta múltiplos; o override por ficheiro usa selecção simples por agora
- **Progresso de upload no modal** — o upload é gerido pelo backend após o job terminar
- **Alterações ao `IngestProfileModal`** — já tem `CloudDestinationPicker`
