# MinIO Local - Nexora Desktop

> Instancia MinIO totalmente isolada para desenvolvimento local da aplicacao Nexora Desktop.
> **Nao interfere** no MinIO existente do Nexora Media Processing (`nexora-minio` nas portas 9000/9001).

---

## TL;DR

```powershell
# Arrancar e verificar
.\scripts\start-local-minio.ps1

# Parar (dados preservam-se)
.\scripts\stop-local-minio.ps1

# Reiniciar do zero (dados eliminados)
.\scripts\start-local-minio.ps1 -Reset
```

---

## Arquitetura Isolada

| Caracteristica | MinIO Existente (Media Processing)    | MinIO Local (Desktop Dev)             |
| -------------- | ------------------------------------- | ------------------------------------- |
| Container      | `nexora-minio`                        | `nexora-desktop-minio`                |
| Porta API S3   | `9000`                                | `9010`                                |
| Porta Console  | `9001`                                | `9011`                                |
| Volume Docker  | `nexoramediaprocessing_minio_data`    | `nexora-desktop-minio-data`           |
| Credenciais    | `nexoraadmin` / `nexora_minio_secret` | `desktopadmin` / `desktop_secret_key` |

---

## Dados de Acesso

### Console Web (UI)

- **URL:** http://localhost:9011
- **User:** `desktopadmin`
- **Pass:** `desktop_secret_key`

### API S3

- **Endpoint:** http://localhost:9010

---

## Configuracao na Aplicacao

Preencha os seguintes campos nas settings da Nexora Desktop:

| Campo          | Valor                   |
| -------------- | ----------------------- |
| **Bucket**     | `nexora-desktop`        |
| **Regiao**     | `us-east-1`             |
| **Endpoint**   | `http://localhost:9010` |
| **Pasta base** | `uploads/`              |
| **Access Key** | `desktopadmin`          |
| **Secret Key** | `desktop_secret_key`    |

> **Nota sobre o Endpoint:** Deixe o campo Endpoint vazio apenas se quiser usar AWS S3 real. Para MinIO local (ou qualquer S3-compativel self-hosted), deve indicar o endpoint completo.

---

## Sobre o Prefixo `uploads/`

O prefixo `uploads/` funciona como uma "pasta base" dentro do bucket. Os ficheiros serao armazenados em caminhos como:

```
s3://nexora-desktop/uploads/screenshot-001.png
s3://nexora-desktop/uploads/videos/clip-002.mp4
```

Na aplicacao, o prefixo e automaticamente concatenado ao nome do ficheiro ao fazer uploads. Para listar ficheiros, a aplicacao deve filtrar objetos com o prefixo `uploads/`.

---

## Gestao do Container

### Verificar Estado

```powershell
docker ps --filter "name=nexora-desktop-minio"
docker logs nexora-desktop-minio
```

### Aceder via CLI (mc)

```powershell
# Configurar alias temporario (via Docker)
docker run --rm --network host --entrypoint sh minio/mc -c "mc alias set local http://host.docker.internal:9010 desktopadmin desktop_secret_key && mc ls local/nexora-desktop"
```

### Backup dos Dados

```powershell
# O volume e 'nexora-desktop-minio-data'. Faca backup do volume:
docker run --rm -v nexora-desktop-minio-data:/data -v ${PWD}:/backup alpine tar czf /backup/minio-desktop-backup.tar.gz -C /data .
```

### Restaurar Dados

```powershell
docker run --rm -v nexora-desktop-minio-data:/data -v ${PWD}:/backup alpine sh -c "cd /data && tar xzf /backup/minio-desktop-backup.tar.gz"
```

---

## Resolucao de Problemas

| Problema                        | Causa Provavel               | Solucao                                                            |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Porta 9010 ja em uso            | Outro servico a usar a porta | Edite o script para usar outra porta ou pare o servico conflituoso |
| "Access Denied" ao criar bucket | Credenciais erradas          | Verifique se o container arrancou corretamente com `docker logs`   |
| Console nao carrega             | Container ainda a arrancar   | Aguarde 5-10 segundos e recarregue                                 |
| Dados perdidos apos reboot      | Volume nao montado           | Verifique que o container usa `-v nexora-desktop-minio-data:/data` |

---

## Alteracoes Futuras

Se precisar de alterar portas, credenciais, ou nome do bucket:

1. Pare o container: `.\scripts\stop-local-minio.ps1`
2. Elimine o container e volume: `.\scripts\start-local-minio.ps1 -Reset`
3. Edite os scripts `start-local-minio.ps1` e `stop-local-minio.ps1` com os novos valores.
4. Arranque novamente: `.\scripts\start-local-minio.ps1`
