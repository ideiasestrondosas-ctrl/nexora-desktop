# Nexora Desktop — Guia de Testes Beta

**Versão:** v0.31.5-beta.1  
**Data:** Junho 2026  
**Aplicação:** Nexora Desktop — Processamento de Média Nativo

---

> **Este guia é para ti.**  
> Não precisas de saber nada sobre programação, vídeo ou tecnologia para o usar.  
> Cada teste tem todos os passos explicados, um a um, desde o início.  
> O teu feedback é essencial para tornar a aplicação melhor.

---

## Índice

1. [O que é o Nexora Desktop?](#1-o-que-é-o-nexora-desktop)
2. [Antes de começar](#2-antes-de-começar)
3. [Como reportar um problema](#3-como-reportar-um-problema)
4. [Testes](#4-testes)
   - [T01 — Primeiro Arranque](#t01--primeiro-arranque-assistente-de-instalação)
   - [T02 — Dashboard (Painel Principal)](#t02--dashboard-painel-principal)
   - [T03 — Biblioteca](#t03--biblioteca)
   - [T04 — Fila de Processamento](#t04--fila-de-processamento)
   - [T05 — Perfis de Transcodificação](#t05--perfis-de-transcodificação)
   - [T06 — Definições › Geral](#t06--definições--geral)
   - [T07 — Definições › Interface](#t07--definições--interface)
   - [T08 — Definições › Sistema](#t08--definições--sistema)
   - [T09 — Definições › Logs](#t09--definições--logs)
   - [T10 — Definições › Cloud](#t10--definições--cloud)
   - [T11 — Definições › Pastas Monitorizadas](#t11--definições--pastas-monitorizadas)
   - [T12 — Definições › Privacidade](#t12--definições--privacidade)
   - [T13 — Definições › Avançado](#t13--definições--avançado)
   - [T14 — Definições › Sobre](#t14--definições--sobre)
   - [T15 — Detalhe de Ficheiro](#t15--detalhe-de-ficheiro)
   - [T16 — Comparador Visual](#t16--comparador-visual)
   - [T17 — Relatório de Bug](#t17--relatório-de-bug)
   - [T18 — Manual de Ajuda](#t18--manual-de-ajuda)
   - [T19 — Atalhos de Teclado](#t19--atalhos-de-teclado)
   - [T20 — Temas Visuais](#t20--temas-visuais)
   - [T21 — Idiomas](#t21--idiomas)
   - [T22 — Funcionalidades desde v0.30.11](#t22--funcionalidades-introduzidas-desde-v03011)
5. [Glossário](#5-glossário)
6. [Contactos e Suporte](#6-contactos-e-suporte)

---

## 1. O que é o Nexora Desktop?

O **Nexora Desktop** é uma aplicação para Windows que converte ficheiros de vídeo de um formato para outro (por exemplo, de `.mov` para `.mp4`), ajusta a qualidade de imagem e áudio, e organiza todos os ficheiros processados num só lugar.

**Podes usá-la para:**

- Importar vídeos do teu computador ou pasta de rede
- Converter vídeos para diferentes formatos e qualidades (televisão, web, redes sociais)
- Ver o estado de cada conversão em tempo real
- Comparar o vídeo original com o convertido lado a lado
- Gerir destinos cloud (FTP, S3, Google Drive) para envio automático de ficheiros

---

## 2. Antes de começar

### Requisitos do sistema

| Componente         | Mínimo                                                  |
| ------------------ | ------------------------------------------------------- |
| Sistema operativo  | Windows 10 (64-bit) ou mais recente                     |
| Processador        | Qualquer processador moderno de 64-bit                  |
| Memória RAM        | 4 GB                                                    |
| Espaço em disco    | 500 MB para a app + espaço para os teus vídeos          |
| Ligação à internet | Opcional (necessária apenas para actualizações e cloud) |

### Como instalar

1. Descarrega o ficheiro `.msi` ou `.exe` a partir do link fornecido pela equipa.
2. Faz duplo clique no ficheiro descarregado.
3. Segue as instruções do assistente de instalação (clica em **Seguinte** até ao fim).
4. No final, clica em **Concluir** — a app abre automaticamente.

### O que preparar antes dos testes

Precisas de **2 a 3 ficheiros de vídeo** no teu computador para fazer os testes. Qualquer vídeo serve:

- Formato preferido: `.mp4` ou `.mkv`
- Duração recomendada: entre 30 segundos e 5 minutos (para os testes não demorarem muito)
- Se não tiveres vídeos à mão, podes descarregar exemplos gratuitos em [sample-videos.com](https://sample-videos.com)

---

## 3. Como reportar um problema

### Quando deves reportar?

Reporta sempre que:

- A app bloqueia, fecha sozinha, ou mostra uma mensagem de erro inesperada
- Um botão não faz nada quando clicas
- Uma funcionalidade não produz o resultado descrito no guia
- O texto está cortado, ilegível, ou aparece em código (ex: `help.tabs.assetDetail`)
- Algo parece "estranho" mesmo que não percebas bem porquê

### Como usar o botão de reporte na app

1. Na aplicação, clica no ícone **?** (ponto de interrogação) no canto superior direito.
2. No menu que aparece, selecciona **Reportar Bug**.
3. Preenche o formulário:
   - **Título** _(obrigatório)_: Descreve o problema em poucas palavras. Ex: "App fecha ao clicar em Biblioteca"
   - **Descrição** _(opcional)_: Explica o que estavas a fazer quando aconteceu
   - **Incluir logs** _(mantém activado)_: Envia informação técnica útil para a equipa
4. Clica em uma das opções:
   - **Copiar para clipboard**: Cola depois num email ou mensagem
   - **Abrir no GitHub**: Cria um relatório directamente no GitHub (requer conta GitHub)
   - **Guardar ficheiro**: Guarda o relatório num ficheiro no teu computador

### Modelo de relatório (se não usares o botão da app)

```
TÍTULO: [descreve o problema em poucas palavras]

O QUE ACONTECEU:
[descreve o que a app fez de errado]

PASSOS PARA REPRODUZIR:
1. Abri a app
2. Cliquei em...
3. Depois em...
4. Aconteceu...

O QUE DEVIA TER ACONTECIDO:
[descreve o que esperavas que acontecesse]

GRAVIDADE:
[ ] Bloqueador — a app fica inutilizável
[ ] Grave — funcionalidade importante não funciona
[ ] Menor — funcionalidade secundária com problema
[ ] Sugestão — ideia de melhoria

SISTEMA:
- Windows: [ex: Windows 11 Home]
- Versão da app: [ver em Definições › Sobre]
- O problema acontece sempre? [ ] Sim [ ] Não [ ] Às vezes
```

### O que NÃO reportar (limitações conhecidas)

Estes pontos **já são conhecidos** pela equipa e não precisam de ser reportados:

- A actualização automática mostra erro — normal em versões de teste
- O iCloud Drive aparece mas não funciona — não está suportado nesta versão
- Versões para macOS e Linux não estão disponíveis nesta beta
- O Google Drive e Dropbox precisam de configuração OAuth — erro de credenciais é esperado se não configurares
- Há um atraso de 3 segundos nas Pastas Monitorizadas antes de detectar ficheiros novos — é intencional
- O VMAF pode demorar 2–3× o tempo do vídeo em ficheiros com mais de 10 minutos — é normal
- O botão "Criar atalho no desktop" só aparece em Windows (macOS e Linux: o botão não está visível)

---

## 4. Testes

> **Como usar esta secção:**  
> Cada teste tem um **ID** (ex: T01-01), um **objetivo**, os **passos** numerados, e o **resultado esperado**.  
> Segue os passos na ordem indicada.  
> Se o resultado for diferente do esperado, reporta o problema usando o modelo acima.  
> No final de cada teste, assinala ✅ (passou) ou ❌ (falhou) para registar o teu progresso.

---

### T01 — Primeiro Arranque (Assistente de Instalação)

> **Objetivo:** Verificar que o assistente de boas-vindas aparece na primeira abertura e que as configurações iniciais são guardadas correctamente.

---

#### T01-01 — Assistente aparece na primeira abertura

**Precisas de:** A app instalada, nunca ter sido aberta antes (ou usar a opção "Reiniciar Onboarding" em Definições › Avançado).

**Passos:**

1. Abre o Nexora Desktop pela primeira vez.
2. Aguarda que a janela principal carregue.

**O que deve acontecer:**

- Aparece uma janela centrada com o título "Bem-vindo ao Nexora" (ou "Welcome to Nexora" em inglês).
- A janela tem uma barra de progresso no topo e mostra "Passo 1 de 4".

**Se não funcionar:** Reporta com título "Assistente de boas-vindas não aparece no primeiro arranque".

---

#### T01-02 — Navegar pelo assistente (Passos 1 a 4)

**Precisas de:** O assistente de boas-vindas estar aberto (T01-01 passou).

**Passos:**

1. No Passo 1 (Boas-vindas), lê o texto e clica no botão **Seguinte** (ou **Next**).
2. No Passo 2 (Pasta de Saída), verifica que aparece um caminho de pasta. Clica em **Escolher** e selecciona uma pasta no teu computador. Clica em **Seguinte**.
3. No Passo 3 (Privacidade), verifica que existe um interruptor. Podes activá-lo ou desactivá-lo conforme preferires. Clica em **Seguinte**.
4. No Passo 4 (Concluído), clica em **Começar** (ou **Start**, botão verde).

**O que deve acontecer:**

- Cada passo avança sem erros.
- A barra de progresso enche-se progressivamente.
- O botão **Voltar** funciona para regressar ao passo anterior.
- Após clicar em **Começar**, o assistente fecha e a app principal aparece.

**Se não funcionar:** Reporta com título "Assistente de boas-vindas — erro no passo [X]" e descreve o que aconteceu.

---

#### T01-03 — Configurações guardadas após o assistente

**Precisas de:** Ter completado T01-02 com uma pasta de saída diferente da predefinida.

**Passos:**

1. Com a app aberta, clica em **Definições** no menu da esquerda (ícone de engrenagem).
2. Clica no separador **Geral**.
3. Procura a secção "Pasta de Saída" ou "Output Directory".

**O que deve acontecer:**

- A pasta que escolheste no assistente aparece aqui.

**Se não funcionar:** Reporta com título "Pasta de saída não é guardada após assistente de boas-vindas".

---

### T02 — Dashboard (Painel Principal)

> **Objetivo:** Verificar que o painel principal mostra informações correctas e actualizadas.

---

#### T02-01 — Dashboard carrega sem erros

**Passos:**

1. Com a app aberta, clica em **Dashboard** no menu da esquerda (ícone de casa ou grelha).

**O que deve acontecer:**

- A página carrega em menos de 3 segundos.
- Não aparecem mensagens de erro.
- Vês pelo menos três cartões com números no topo da página ("Total de Ficheiros", "Trabalhos Hoje", "VMAF Médio").

**Se não funcionar:** Reporta com título "Dashboard não carrega" e indica se aparece alguma mensagem de erro.

---

#### T02-02 — Estado inicial (sem ficheiros)

**Passos:**

1. Se ainda não importaste nenhum ficheiro, o Dashboard deve mostrar um estado vazio.
2. Verifica o que aparece na área central da página.

**O que deve acontecer:**

- Aparece uma mensagem de boas-vindas ou um ícone a indicar que não há ficheiros.
- Há um botão ou ligação para ir à Biblioteca e importar o primeiro ficheiro.

**Se não funcionar:** Reporta com título "Dashboard não mostra estado inicial correctamente".

---

#### T02-03 — Gráficos de sistema (CPU e RAM)

**Passos:**

1. Permanece no Dashboard durante 10 a 15 segundos.
2. Observa a parte inferior da página.

**O que deve acontecer:**

- Há dois gráficos de linhas: um para **CPU** e um para **RAM**.
- Os valores actualizam-se a cada 2 segundos aproximadamente.
- Os valores percentuais mostrados fazem sentido (ex: CPU a 5-30% em repouso).

**Se não funcionar:** Reporta com título "Gráficos de CPU/RAM não aparecem ou não actualizam".

---

#### T02-04 — Lista de trabalhos recentes (após processamento)

> _Este teste só se aplica depois de teres processado pelo menos um ficheiro (ver T03 e T04)._

**Passos:**

1. Volta ao Dashboard depois de ter processado um ficheiro.
2. Observa a secção "Trabalhos Recentes" ou "Recent Jobs".

**O que deve acontecer:**

- O ficheiro processado aparece na lista com o nome, o perfil usado, o estado (ex: "Concluído") e a hora.
- Clicar no item leva-te à página de detalhe desse ficheiro.

**Se não funcionar:** Reporta com título "Trabalhos recentes não aparecem no Dashboard".

---

### T03 — Biblioteca

> **Objetivo:** Verificar todas as formas de importar ficheiros, navegar, filtrar e eliminar.

---

#### T03-01 — Abrir a Biblioteca

**Passos:**

1. Clica em **Biblioteca** no menu da esquerda.

**O que deve acontecer:**

- A página da Biblioteca abre.
- Se ainda não importaste ficheiros, aparece uma área com texto a dizer que podes arrastar ficheiros ou clicar num botão para importar.
- Se já importaste ficheiros, aparecem os cartões ou a lista dos ficheiros.

---

#### T03-02 — Importar ficheiro pelo botão

**Precisas de:** Um ficheiro de vídeo (`.mp4`, `.mkv`, `.mov`, `.avi`) no teu computador.

**Passos:**

1. Na Biblioteca, clica no botão **+ Adicionar Vídeos** (canto superior direito, azul).
2. Na janela que abre, navega até ao teu ficheiro de vídeo.
3. Selecciona o ficheiro e clica em **Abrir**.

**O que deve acontecer:**

- O ficheiro aparece na Biblioteca com um ícone ou imagem em miniatura.
- O estado mostra "A aguardar" ou "Em análise" (cor cinzenta ou azul).
- Após alguns segundos, o estado muda para "Concluído" ou "Pronto".

**Se não funcionar:** Reporta com título "Importação por botão não funciona" e indica o tipo de ficheiro.

---

#### T03-03 — Importar ficheiro por arrastar e largar (drag-and-drop)

**Precisas de:** Um ficheiro de vídeo e a janela da Biblioteca aberta.

**Passos:**

1. Abre o **Explorador de Ficheiros** do Windows (tecla Windows + E).
2. Navega até ao teu ficheiro de vídeo.
3. Mantém o botão do rato premido sobre o ficheiro e arrasta-o para a janela do Nexora.
4. Larga o botão do rato.

**O que deve acontecer:**

- Enquanto arrastas sobre a janela, a área da Biblioteca muda de aspecto (borda azul a aparecer).
- Ao largar, o ficheiro aparece na lista tal como em T03-02.

**Se não funcionar:** Reporta com título "Drag-and-drop não funciona na Biblioteca".

---

#### T03-04 — Importar uma pasta inteira

**Precisas de:** Uma pasta com 2 ou mais ficheiros de vídeo.

**Passos:**

1. Na Biblioteca, clica no botão **Adicionar Pasta** (ícone de pasta, ao lado do botão azul).
2. Na janela que abre, selecciona a pasta com os vídeos.
3. Clica em **Seleccionar Pasta**.

**O que deve acontecer:**

- Todos os ficheiros de vídeo da pasta aparecem na Biblioteca.

**Se não funcionar:** Reporta com título "Importação de pasta não funciona".

---

#### T03-05 — Trocar entre vista de grelha e lista

**Precisas de:** Pelo menos um ficheiro na Biblioteca.

**Passos:**

1. Na Biblioteca, procura os dois ícones de vista no canto superior direito (um parece uma grelha, o outro parece linhas).
2. Clica no ícone de **lista** (linhas).
3. Observa como os ficheiros são mostrados.
4. Clica de volta no ícone de **grelha**.

**O que deve acontecer:**

- Na vista de lista, os ficheiros aparecem em linhas com colunas (nome, estado, tamanho, duração).
- Na vista de grelha, os ficheiros aparecem como cartões com imagem em miniatura.
- A troca é imediata, sem perder ficheiros ou dados.

**Se não funcionar:** Reporta com título "Troca de vista grelha/lista não funciona".

---

#### T03-06 — Pesquisar ficheiros

**Precisas de:** Pelo menos 2 ficheiros na Biblioteca com nomes diferentes.

**Passos:**

1. Na barra de pesquisa no topo da Biblioteca, escreve parte do nome de um dos ficheiros (ex: se tens "video_teste.mp4", escreve "teste").
2. Observa os resultados enquanto escreves.
3. Apaga o texto da pesquisa.

**O que deve acontecer:**

- Enquanto escreves, apenas os ficheiros cujo nome contém o texto aparecem.
- Ao apagar o texto, voltam a aparecer todos os ficheiros.
- A pesquisa não faz distinção entre maiúsculas e minúsculas.

**Se não funcionar:** Reporta com título "Pesquisa na Biblioteca não filtra correctamente".

---

#### T03-07 — Filtrar por estado

**Precisas de:** Ficheiros com diferentes estados (pelo menos um "Concluído" e um "A aguardar").

**Passos:**

1. Clica no menu pendente de estado (mostra "Todos os estados" por defeito).
2. Selecciona **Concluído** (ou equivalente).
3. Observa os ficheiros mostrados.
4. Selecciona **A aguardar**.
5. Selecciona de novo **Todos os estados**.

**O que deve acontecer:**

- Cada filtro mostra apenas os ficheiros no estado correspondente.
- Seleccionar "Todos os estados" mostra tudo novamente.

**Se não funcionar:** Reporta com título "Filtro de estado na Biblioteca não funciona".

---

#### T03-08 — Ordenar ficheiros

**Passos:**

1. Clica no menu pendente de ordenação (mostra "Mais recente" por defeito).
2. Selecciona **Mais antigo**.
3. Verifica se os ficheiros mudaram de ordem.
4. Selecciona **Nome (A-Z)**.
5. Verifica a ordem alfabética.

**O que deve acontecer:**

- Cada opção de ordenação reorganiza os ficheiros visivelmente.

**Se não funcionar:** Reporta com título "Ordenação na Biblioteca não funciona".

---

#### T03-09 — Seleccionar e eliminar ficheiros

**Atenção:** Este teste elimina ficheiros da Biblioteca. Usa ficheiros de teste que podes perder.

**Passos:**

1. Passa o rato sobre um cartão de ficheiro — deve aparecer uma caixa de selecção no canto superior esquerdo.
2. Clica na caixa de selecção para seleccionar o ficheiro.
3. Selecciona um segundo ficheiro da mesma forma.
4. Observa os botões que aparecem (deve surgir um botão vermelho "Eliminar X seleccionados").
5. Clica no botão vermelho de eliminar.
6. Lê com atenção a janela de confirmação que aparece.
7. Clica em **Cancelar** (para não eliminar agora).

**O que deve acontecer:**

- As caixas de selecção aparecem ao passar o rato.
- Seleccionar vários ficheiros activa os botões de acção em grupo.
- A janela de confirmação pede confirmação antes de eliminar.
- Clicar em Cancelar não elimina nada.

**Se não funcionar:** Reporta com título "Selecção múltipla na Biblioteca não funciona".

---

### T04 — Fila de Processamento

> **Objetivo:** Verificar que é possível submeter um trabalho de processamento, monitorizar o progresso, e gerir trabalhos na fila.  
> _Nota: O processamento real demora tempo. Para os testes, usa ficheiros curtos (menos de 1 minuto)._

---

#### T04-01 — Submeter um trabalho de processamento

**Precisas de:** Um ficheiro importado na Biblioteca (T03-02 passou).

**Passos:**

1. Na Biblioteca, clica no cartão de um ficheiro para abrir o seu detalhe, **ou** passa o rato sobre ele e clica no ícone de olho.
2. Na página de detalhe, procura o botão **Processar** ou **Reprocessar**.
3. Clica nesse botão.
4. Aparece um menu ou modal — selecciona o perfil **web-hd** (boa opção para testes rápidos).
5. Clica em **Confirmar** ou **Iniciar**.

**O que deve acontecer:**

- O trabalho é adicionado à fila.
- Aparece uma notificação ou mensagem a confirmar.

**Se não funcionar:** Reporta com título "Não é possível submeter trabalho de processamento".

---

#### T04-02 — Monitorizar progresso na Fila

**Precisas de:** Um trabalho em processamento (T04-01 passou).

**Passos:**

1. Clica em **Fila** no menu da esquerda.
2. Observa a secção "Em Processamento".

**O que deve acontecer:**

- O trabalho aparece com o nome do ficheiro, o perfil, e uma barra de progresso.
- Há uma visualização das fases do pipeline (Analisar → Converter → Verificar).
- A barra de progresso avança enquanto o trabalho processa.
- Os indicadores de fase mudam de cinzento para azul (em curso) e depois para verde (concluído).

**Se não funcionar:** Reporta com título "Progresso do trabalho não aparece na Fila".

---

#### T04-03 — Cancelar um trabalho em fila

**Precisas de:** Um trabalho em fila (a aguardar, não a processar activamente).

**Passos:**

1. Submete um segundo trabalho (T04-01) — se já há um em processamento, o segundo fica "Em espera".
2. Na Fila, procura a secção "Em Espera" ou "Queued".
3. Clica no botão **X** (cancelar) ao lado do trabalho em espera.

**O que deve acontecer:**

- O trabalho desaparece da fila.
- Aparece na secção de histórico com o estado "Cancelado".

**Se não funcionar:** Reporta com título "Não é possível cancelar trabalho em fila".

---

#### T04-04 — Ver histórico de trabalhos concluídos

**Precisas de:** Pelo menos um trabalho concluído.

**Passos:**

1. Na Fila, desce até à secção "Concluídos e Histórico".
2. Observa a tabela de trabalhos concluídos.

**O que deve acontecer:**

- Aparece uma linha para cada trabalho com: nome do ficheiro, perfil, pontuação VMAF (se disponível), estado, e hora.
- O estado "CONCLUÍDO" aparece a verde.
- Se o VMAF for superior a 85, o número aparece a verde; entre 70-85, a amarelo; abaixo de 70, a vermelho.

**Se não funcionar:** Reporta com título "Histórico de trabalhos não aparece na Fila".

---

#### T04-05 — Reprocessar com perfil diferente

**Precisas de:** Um trabalho concluído no histórico.

**Passos:**

1. Na tabela de histórico, clica no ícone de **repetição** (setas circulares) ao lado de um trabalho concluído.
2. Aparece um menu pequeno com opções de perfil.
3. Selecciona um perfil diferente (ex: **proxy**).

**O que deve acontecer:**

- Um novo trabalho é criado com o mesmo ficheiro mas o perfil seleccionado.
- O trabalho aparece na secção "Em Espera" ou começa a processar imediatamente.

**Se não funcionar:** Reporta com título "Reprocessamento com perfil diferente não funciona".

---

#### T04-06 — Aprovação de ficheiro em quarentena

> _A quarentena ocorre quando a app detecta um possível problema de qualidade no ficheiro após processamento. Pode não acontecer com todos os ficheiros._

**Se vires a secção "QUARENTENA" na Fila:**

**Passos:**

1. Observa os ficheiros listados na secção de quarentena (fundo amarelo/laranja).
2. Clica no ícone de **polegar para cima** (verde) para aprovar um ficheiro.
3. Clica no ícone de **polegar para baixo** (vermelho) para rejeitar outro.

**O que deve acontecer:**

- Ao aprovar, o ficheiro sai da quarentena e aparece como "Concluído" no histórico.
- Ao rejeitar, o ficheiro aparece como "Rejeitado" no histórico.

**Se não funcionar:** Reporta com título "Aprovação/rejeição de quarentena não funciona".

---

### T05 — Perfis de Transcodificação

> **Objetivo:** Verificar a gestão de perfis — ver, criar, editar, duplicar e eliminar.  
> _Os perfis definem como os vídeos são convertidos: resolução, qualidade, formato._

---

#### T05-01 — Ver perfis predefinidos

**Passos:**

1. Clica em **Perfis** no menu da esquerda.
2. Clica no menu pendente de perfis no topo da página.

**O que deve acontecer:**

- Aparecem 6 perfis predefinidos (com cadeado a indicar que não podem ser editados):
  - broadcast-hd
  - broadcast-sd
  - web-4k
  - web-hd
  - proxy
  - social
- Ao seleccionar um perfil, os seus detalhes aparecem à esquerda (resolução, bitrate, codec, etc.).

**Se não funcionar:** Reporta com título "Perfis predefinidos não aparecem".

---

#### T05-02 — Criar um perfil personalizado

**Passos:**

1. Na página de Perfis, clica no botão **+ Criar** (canto superior).
2. No painel lateral que abre:
   - **Nome**: escreve "Teste Beta"
   - **Descrição**: escreve "Perfil criado durante testes"
   - **Contentor**: selecciona MP4
   - **Codec de vídeo**: selecciona H.264
   - **Resolução**: selecciona 1920×1080
   - Mantém os restantes campos com os valores predefinidos
3. Clica em **Guardar**.

**O que deve acontecer:**

- O perfil "Teste Beta" aparece na secção "Personalizados" do menu pendente.
- Os detalhes que configuraste são mostrados correctamente.

**Se não funcionar:** Reporta com título "Criação de perfil personalizado falhou".

---

#### T05-03 — Editar perfil personalizado

**Precisas de:** O perfil "Teste Beta" criado em T05-02.

**Passos:**

1. Selecciona o perfil "Teste Beta" no menu pendente.
2. Clica no botão **Editar**.
3. Altera a descrição para "Perfil editado durante testes".
4. Clica em **Guardar**.

**O que deve acontecer:**

- A nova descrição aparece nos detalhes do perfil.

**Se não funcionar:** Reporta com título "Edição de perfil personalizado falhou".

---

#### T05-04 — Tentar editar um perfil predefinido

**Passos:**

1. Selecciona um dos perfis predefinidos (ex: broadcast-hd).
2. Observa os botões disponíveis.

**O que deve acontecer:**

- O botão **Editar** está desactivado (cinzento) ou não existe.
- Não é possível alterar os perfis predefinidos.

**Se não funcionar:** Reporta com título "Perfil predefinido permite edição — não deveria".

---

#### T05-05 — Duplicar um perfil

**Passos:**

1. Selecciona qualquer perfil (predefinido ou personalizado).
2. Clica no ícone de **duplicar** (dois documentos sobrepostos).

**O que deve acontecer:**

- Um novo perfil é criado com o nome "Cópia de [nome original]" ou similar.
- O novo perfil aparece na secção "Personalizados" e pode ser editado.

**Se não funcionar:** Reporta com título "Duplicação de perfil não funciona".

---

#### T05-06 — Eliminar perfil personalizado

**Precisas de:** O perfil "Teste Beta" (ou qualquer personalizado).

**Passos:**

1. Selecciona o perfil personalizado.
2. Clica no botão **Eliminar** (vermelho).
3. Lê a janela de confirmação e clica em **Confirmar**.

**O que deve acontecer:**

- O perfil desaparece da lista.
- Uma mensagem confirma a eliminação.

**Se não funcionar:** Reporta com título "Eliminação de perfil personalizado falhou".

---

### T06 — Definições › Geral

> **Objetivo:** Verificar que as configurações gerais guardam correctamente.

---

#### T06-01 — Abrir Definições › Geral

**Passos:**

1. Clica em **Definições** no menu da esquerda.
2. Confirma que estás no separador **Geral** (deve ser o primeiro).

**O que deve acontecer:**

- A página carrega com várias secções: Importação, Processamento, Qualidade, Aceleração de Hardware, Notificações.

---

#### T06-02 — Alterar pasta de saída

**Passos:**

1. Na secção "Processamento", junto a "Pasta de Saída", clica em **Escolher**.
2. Selecciona uma pasta diferente (ex: o teu Ambiente de Trabalho).
3. Clica em **Seleccionar Pasta**.

**O que deve acontecer:**

- O caminho da pasta actualiza-se imediatamente.
- A configuração é guardada (mesmo depois de fechar e reabrir as Definições).

**Se não funcionar:** Reporta com título "Pasta de saída não guarda nas Definições › Geral".

---

#### T06-03 — Alterar número de trabalhos simultâneos

**Passos:**

1. Na secção "Processamento", encontra o controlo deslizante "Trabalhos Simultâneos".
2. Arrasta o controlo para o valor 2.
3. Navega para outra página e volta às Definições › Geral.

**O que deve acontecer:**

- O valor 2 está guardado quando regressas.

---

#### T06-04 — Activar/desactivar notificações

**Passos:**

1. Na secção "Notificações", clica no interruptor para activar as notificações do sistema.
2. Verifica que o interruptor muda de estado (activado = azul, desactivado = cinzento).
3. Clica de novo para desactivar.

**O que deve acontecer:**

- O interruptor responde ao clique e muda visualmente.
- O estado é guardado.

---

### T07 — Definições › Interface

> **Objetivo:** Verificar as opções de tema e idioma.

---

#### T07-01 — Trocar tema

**Passos:**

1. Em Definições, clica no separador **Interface**.
2. Na secção "Tema", clica em **Claro** (Light).
3. Observa a app.
4. Clica em **Escuro** (Dark).
5. Clica em **Sistema** (System).

**O que deve acontecer:**

- Ao clicar em Claro, o fundo da app fica branco/claro imediatamente.
- Ao clicar em Escuro, o fundo fica preto/escuro imediatamente.
- Ao clicar em Sistema, a app adopta o tema do Windows (Definições do Windows → Personalização → Cores).

**Se não funcionar:** Reporta com título "Troca de tema não funciona".

---

#### T07-02 — Trocar idioma

**Passos:**

1. Na secção "Idioma", clica no menu pendente.
2. Selecciona **English**.
3. Observa os menus e etiquetas da app.
4. Volta ao menu pendente e selecciona **Português**.

**O que deve acontecer:**

- A interface muda imediatamente para o idioma seleccionado — menus, botões, etiquetas.
- Ao voltar ao Português, tudo regressa ao idioma original.

**Se não funcionar:** Reporta com título "Troca de idioma não funciona" e indica qual o idioma que falhou.

---

#### T07-03 — Verificar idioma em Espanhol

**Passos:**

1. No menu pendente de Idioma, selecciona **Español**.
2. Navega por Dashboard, Biblioteca e Definições.
3. Verifica se os textos estão em espanhol.

**O que deve acontecer:**

- Os textos principais estão em espanhol.
- Não aparecem textos no formato de código (ex: `help.tabs.assetDetail`).

**Se não funcionar:** Reporta com título "Idioma Espanhol — textos em formato de código ou não traduzidos".

---

### T08 — Definições › Sistema

> **Objetivo:** Verificar as informações de sistema e a limpeza de cache.

---

#### T08-01 — Ver informações do sistema

**Passos:**

1. Em Definições, clica no separador **Sistema**.
2. Aguarda que a página carregue (pode demorar até 5 segundos).

**O que deve acontecer:**

- Aparece informação sobre o teu computador: sistema operativo, processador, memória RAM, disco, e placa gráfica (GPU).
- Os valores fazem sentido (ex: o teu Windows, o processador correcto, a RAM correcta).

**Se não funcionar:** Reporta com título "Informações de sistema não carregam" e indica se aparece algum erro.

---

#### T08-02 — Limpar cache de miniaturas

> _A cache são ficheiros temporários que a app guarda para ser mais rápida. Limpá-la não apaga os teus vídeos._

**Passos:**

1. Na secção "Cache", encontra o cartão "Cache de Miniaturas".
2. Nota o tamanho mostrado (ex: "850 MB").
3. Clica no botão **Limpar** (nesse cartão).
4. Confirma na janela que aparecer.
5. Aguarda alguns segundos.

**O que deve acontecer:**

- O tamanho da cache reduz (pode mostrar "0 MB" ou um valor muito menor).
- Uma mensagem confirma que a limpeza foi concluída.
- A app continua a funcionar normalmente.

**Se não funcionar:** Reporta com título "Limpeza de cache de miniaturas falhou".

---

### T09 — Definições › Logs

> **Objetivo:** Verificar as opções de registo (logs) de actividade.  
> _Os logs são registos automáticos do que a app faz — úteis para diagnosticar problemas._

---

#### T09-01 — Alterar nível de verbosidade

**Passos:**

1. Em Definições, clica no separador **Logs**.
2. Na secção "Verbosidade", verifica as três opções: Básico, Normal, e Debug.
3. Clica em **Debug**.
4. Clica em **Normal** para voltar.

**O que deve acontecer:**

- As opções comportam-se como botões de selecção (só um activo de cada vez).
- A selecção é imediatamente visível.

---

#### T09-02 — Abrir pasta de logs

**Passos:**

1. Na secção "Armazenamento", clica no botão **Abrir Pasta**.

**O que deve acontecer:**

- O Explorador de Ficheiros do Windows abre na pasta onde os logs são guardados.
- A pasta existe e pode conter ficheiros `.log`.

**Se não funcionar:** Reporta com título "Botão Abrir Pasta de Logs não funciona".

---

### T10 — Definições › Cloud

> **Objetivo:** Verificar a configuração de destinos cloud para envio automático de ficheiros.  
> _Podes configurar servidores FTP, S3, Google Drive, etc. para onde a app envia os vídeos após processar._

---

#### T10-01 — Adicionar perfil FTP

**Precisas de:** Acesso a um servidor FTP (host, utilizador, password). Se não tiveres, podes usar credenciais de teste falsas apenas para verificar o formulário.

**Passos:**

1. Em Definições, clica no separador **Cloud**.
2. Clica no botão **+ Novo Perfil**.
3. Na janela que abre:
   - **Fornecedor**: selecciona **FTP**
   - **Nome do perfil**: escreve "Servidor Teste"
   - **Host**: escreve qualquer valor (ex: `ftp.exemplo.com`)
   - **Porto**: mantém 21
   - **Utilizador**: escreve `utilizador`
   - **Password**: escreve `password`
4. Clica em **Testar Ligação** (aguarda a resposta — pode falhar se o servidor não existir).
5. Clica em **Criar**.

**O que deve acontecer:**

- O formulário aceita os dados sem erros de validação.
- O perfil "Servidor Teste" aparece na lista da tab Cloud.
- O botão "Testar Ligação" mostra algum resultado (sucesso ou erro de ligação — ambos são válidos).

**Se o formulário falhar ao guardar:** Reporta com título "Não é possível criar perfil Cloud FTP".

---

#### T10-02 — Editar e eliminar perfil cloud

**Precisas de:** O perfil "Servidor Teste" criado em T10-01.

**Passos:**

1. Na lista de perfis cloud, clica no ícone de **editar** (lápis) junto ao perfil "Servidor Teste".
2. Altera o nome para "FTP Editado".
3. Clica em **Actualizar**.
4. Clica no ícone de **eliminar** (lixo vermelho) junto ao perfil.
5. Confirma a eliminação.

**O que deve acontecer:**

- O nome actualiza-se na lista.
- Após eliminar, o perfil desaparece da lista.

---

### T11 — Definições › Pastas Monitorizadas

> **Objetivo:** Verificar a funcionalidade de monitorização automática de pastas.  
> _Com esta funcionalidade, podes indicar à app uma pasta do teu computador e ela importa automaticamente os novos vídeos que aí aparecerem._

---

#### T11-01 — Adicionar pasta monitorizada

**Passos:**

1. Em Definições, clica no separador **Pastas Monitorizadas** (ou "Watch Folders").
2. Clica em **Adicionar Pasta**.
3. Selecciona uma pasta do teu computador (ex: uma pasta "Vídeos Teste" no Ambiente de Trabalho).
4. Clica em **Seleccionar Pasta**.

**O que deve acontecer:**

- A pasta aparece na lista com o caminho e o estado "Activa" (verde).

---

#### T11-02 — Desactivar e reactivar pasta

**Passos:**

1. Na lista de pastas, clica no botão de activação/desactivação junto à pasta adicionada.
2. Observa a mudança de estado.
3. Clica de novo para reactivar.

**O que deve acontecer:**

- O estado muda de "Activa" (verde) para "Desactivada" (cinzento) e vice-versa.

---

#### T11-03 — Remover pasta monitorizada

**Passos:**

1. Clica no botão **Remover** (vermelho) junto à pasta.
2. Confirma se aparecer uma janela de confirmação.

**O que deve acontecer:**

- A pasta desaparece da lista.

---

### T12 — Definições › Privacidade

> **Objetivo:** Verificar as opções de privacidade e telemetria.  
> _A telemetria são dados anónimos de utilização que a app pode enviar para ajudar a melhorá-la. Podes desactivar a qualquer momento._

---

#### T12-01 — Activar/desactivar telemetria

**Passos:**

1. Em Definições, clica no separador **Privacidade**.
2. Clica no interruptor de telemetria.

**O que deve acontecer:**

- O interruptor muda de estado visualmente.
- Nenhuma mensagem de erro aparece.

---

#### T12-02 — Ver dados recolhidos

**Passos:**

1. Clica no botão **Ver Dados Recolhidos**.

**O que deve acontecer:**

- Aparece uma caixa com texto (pode estar vazia se a telemetria estava desactivada, ou com dados JSON se estava activa).
- A caixa tem scroll se houver muito conteúdo.

---

#### T12-03 — Limpar dados de telemetria

**Passos:**

1. Clica no botão **Limpar Todos os Dados**.

**O que deve acontecer:**

- Uma confirmação é pedida.
- Após confirmar, a caixa de "Ver Dados" fica vazia.

---

### T13 — Definições › Avançado

> **Objetivo:** Verificar as ferramentas de manutenção avançadas.  
> ⚠️ **Atenção:** O "Factory Reset" apaga TUDO. Só o faças se quiseres mesmo recomeçar do zero.

---

#### T13-01 — Exportar configurações

**Passos:**

1. Em Definições, clica no separador **Avançado**.
2. Na secção "Dados", clica no botão **Exportar** (ícone de transferência para baixo).
3. Selecciona onde guardar o ficheiro de cópia de segurança.

**O que deve acontecer:**

- Um ficheiro `.json` é guardado no local escolhido.
- O ficheiro pode ser aberto com um editor de texto e contém as tuas configurações.

---

#### T13-02 — Importar configurações

**Precisas de:** O ficheiro exportado em T13-01.

**Passos:**

1. Clica no botão **Importar** (ícone de transferência para cima).
2. Selecciona o ficheiro `.json` exportado.

**O que deve acontecer:**

- As configurações são importadas sem erros.
- Uma mensagem de confirmação aparece.

---

#### T13-03 — Reiniciar o assistente de boas-vindas

**Passos:**

1. Na secção "Manutenção", clica no botão **Reiniciar** junto a "Mostrar assistente de boas-vindas".
2. Fecha e volta a abrir a app.

**O que deve acontecer:**

- Na próxima abertura, o assistente de boas-vindas aparece novamente (como em T01-01).

---

#### T13-04 — Factory Reset _(OPCIONAL — apaga tudo)_

> ⚠️ **Só faças este teste se quiseres apagar todos os dados da app e recomeçar do zero.**

**Passos:**

1. Clica no botão **Factory Reset** (vermelho).
2. Lê atentamente a **primeira** janela de confirmação e clica em **Confirmar**.
3. Lê atentamente a **segunda** janela (pergunta se queres apagar também os ficheiros processados) e escolhe.
4. Aguarda que a app reinicie.

**O que deve acontecer:**

- Aparecem **duas** janelas de confirmação (protecção contra cliques acidentais).
- A app fecha e volta a abrir.
- Ao reabrir, está como se fosse a primeira vez (assistente de boas-vindas aparece, sem histórico).

**Se não funcionar:** Reporta com título "Factory Reset não funciona correctamente" e descreve o passo onde falhou.

---

### T14 — Definições › Sobre

> **Objetivo:** Verificar as informações de versão e a funcionalidade de actualizações.

---

#### T14-01 — Ver versão da app

**Passos:**

1. Em Definições, clica no separador **Sobre**.

**O que deve acontecer:**

- A versão da app aparece claramente (ex: "v0.30.0-beta.1").
- Há uma lista de notas de actualização (changelog) com as novidades da versão actual.

---

#### T14-02 — Verificar actualizações

**Passos:**

1. No separador Sobre, clica no botão **Verificar Actualizações**.

**O que deve acontecer:**

- O botão fica temporariamente desactivado (a verificar).
- Após alguns segundos, aparece uma mensagem:
  - "Estás na versão mais recente" — se não houver actualizações
  - Ou informação sobre uma nova versão disponível
- _Nota: Em versões de teste (beta), pode aparecer um aviso de "modo dev" — isso é normal._

---

### T15 — Detalhe de Ficheiro

> **Objetivo:** Verificar a página de detalhe de um ficheiro com os seus metadados e histórico de trabalhos.

---

#### T15-01 — Abrir detalhe de ficheiro

**Precisas de:** Um ficheiro importado na Biblioteca.

**Passos:**

1. Na Biblioteca, clica no nome ou miniatura de um ficheiro.

**O que deve acontecer:**

- Abre uma página com informações detalhadas do ficheiro:
  - Nome do ficheiro
  - Tamanho
  - Duração
  - Resolução (ex: 1920×1080)
  - Codec de vídeo (ex: H.264)
  - Codec de áudio (ex: AAC)
- Há uma secção com o histórico de trabalhos realizados neste ficheiro.

---

#### T15-02 — Submeter trabalho a partir do detalhe

**Passos:**

1. Na página de detalhe, clica no botão **Processar**.
2. Selecciona um perfil.
3. Confirma.

**O que deve acontecer:**

- O trabalho é adicionado à fila (podes verificar em Fila).
- A página de detalhe mostra o novo trabalho no histórico com estado "Em fila" ou "A processar".

---

### T16 — Comparador Visual

> **Objetivo:** Verificar o comparador lado a lado de vídeo original vs. processado.  
> _O comparador só aparece quando um ficheiro já foi processado e tem um ficheiro de saída._

---

#### T16-01 — Abrir o comparador

**Precisas de:** Um ficheiro com processamento concluído (estado verde "Concluído").

**Passos:**

1. Na página de detalhe do ficheiro processado, procura o botão **Comparar** ou **Comparador Visual**.
2. Clica nesse botão.

**O que deve acontecer:**

- Abre uma janela ou secção com dois vídeos lado a lado.
- O lado esquerdo mostra o vídeo original, o lado direito mostra o processado.
- Há uma linha divisória entre os dois que podes arrastar.
- Há etiquetas a indicar "Original" e "Processado".

**Se não funcionar:** Reporta com título "Comparador Visual não abre".

---

#### T16-02 — Controlar a linha divisória

**Passos:**

1. Com o comparador aberto, clica e arrasta a linha divisória para a esquerda.
2. Arrasta para a direita.

**O que deve acontecer:**

- A linha move-se com o rato.
- Ao mover para a esquerda, vê-se mais do vídeo processado; ao mover para a direita, mais do original.

---

#### T16-03 — Reprodução sincronizada

**Passos:**

1. Clica no botão de **Play** (reproduzir) abaixo dos vídeos.
2. Observa ambos os vídeos.
3. Clica no botão de **Pausa**.
4. Arrasta a barra de progresso para um ponto diferente.

**O que deve acontecer:**

- Ambos os vídeos reproduzem em sincronismo.
- A pausa pára ambos.
- Mover a barra de progresso actualiza a posição em ambos os vídeos.

---

### T17 — Relatório de Bug

> **Objetivo:** Verificar o formulário de reporte de bugs integrado na app.

---

#### T17-01 — Abrir o formulário de bug

**Passos:**

1. Clica no ícone **?** no canto superior direito da app.
2. Selecciona **Reportar Bug** (ou equivalente).

**O que deve acontecer:**

- Abre uma janela com um formulário com campos: Título, Descrição, e uma opção para incluir logs.

---

#### T17-02 — Validação do campo obrigatório

**Passos:**

1. Com o formulário aberto, não preenchas nenhum campo.
2. Clica no botão **Copiar para Clipboard** (ou equivalente).

**O que deve acontecer:**

- O campo Título fica realçado a vermelho indicando que é obrigatório.
- Nenhuma acção é executada sem o título.

---

#### T17-03 — Copiar relatório para clipboard

**Passos:**

1. No campo Título, escreve "Teste de reporte de bug".
2. No campo Descrição, escreve "Este é um teste".
3. Garante que "Incluir logs" está activo.
4. Clica em **Copiar para Clipboard**.

**O que deve acontecer:**

- Uma mensagem de confirmação aparece (ex: "Copiado!").
- Podes colar (Ctrl+V) noutro sítio e ver o relatório formatado.

---

### T18 — Manual de Ajuda

> **Objetivo:** Verificar o manual de ajuda integrado na app.

---

#### T18-01 — Abrir o manual

**Passos:**

1. Clica no ícone **?** no canto superior direito.
2. Selecciona **Ajuda** ou **Manual** (se houver opção separada), ou clica directamente no ícone.

**O que deve acontecer:**

- Abre uma janela grande com um menu lateral à esquerda e conteúdo à direita.
- O menu lateral tem 12 separadores (Introdução, Dashboard, Biblioteca, Detalhe, Importar, Fila, Perfis, Definições, Cloud, Comparador, Logs, Guia Beta).

---

#### T18-02 — Navegar pelos separadores

**Passos:**

1. Clica em cada separador do menu lateral, um a um.
2. Observa o conteúdo que aparece à direita.

**O que deve acontecer:**

- Cada separador mostra conteúdo relevante (texto explicativo, imagem de exemplo, dicas).
- Os nomes dos separadores estão em português (ou no idioma seleccionado) — **não** em formato de código como `help.tabs.assetDetail`.
- As imagens de exemplo carregam correctamente.

**Se algum separador mostrar texto em formato de código:** Reporta com título "Manual de ajuda — nome de separador em formato de código" e indica qual o separador afectado.

---

#### T18-03 — Ver imagem em tamanho completo

**Passos:**

1. Num separador que tenha uma imagem (ex: Dashboard), clica na imagem.

**O que deve acontecer:**

- A imagem abre em tamanho maior numa janela/overlay.
- Podes fechar clicando fora da imagem ou num botão de fechar (X).

---

### T19 — Atalhos de Teclado

> **Objetivo:** Verificar que os atalhos de teclado funcionam correctamente.

---

#### T19-01 — Atalhos de navegação

**Passos:**

1. Com a app aberta, prime **Ctrl + 1** (ou Ctrl + D).
2. Depois **Ctrl + 2** (ou Ctrl + L).
3. Depois **Ctrl + 3** (ou Ctrl + Q).
4. Depois **Ctrl + 4** (ou Ctrl + P).
5. Depois **Ctrl + 5** (ou Ctrl + vírgula).

**O que deve acontecer:**

- Cada atalho navega para a respectiva secção: Dashboard, Biblioteca, Fila, Perfis, Definições.

**Se não funcionar:** Reporta com título "Atalho de teclado [combinação] não funciona".

---

#### T19-02 — Fechar modais com Escape

**Passos:**

1. Abre qualquer modal ou janela flutuante (ex: o manual de ajuda, um formulário).
2. Prime a tecla **Escape** (Esc) no teclado.

**O que deve acontecer:**

- O modal fecha.

---

#### T19-03 — Abrir ajuda com F1

**Passos:**

1. Em qualquer ecrã, prime **F1**.

**O que deve acontecer:**

- O manual de ajuda abre.

---

### T20 — Temas Visuais

> **Objetivo:** Confirmar que os três temas funcionam correctamente em toda a app.

---

#### T20-01 — Verificar tema Claro em todas as secções

**Passos:**

1. Vai a Definições › Interface e selecciona o tema **Claro**.
2. Navega por: Dashboard → Biblioteca → Fila → Perfis → Definições.

**O que deve acontecer:**

- O fundo é branco ou muito claro em todas as secções.
- O texto é escuro e legível.
- Não há áreas com fundo muito escuro que "quebrem" o tema.

**Se não funcionar:** Reporta com título "Tema Claro inconsistente em [secção]" e descreve o problema visual.

---

#### T20-02 — Verificar tema Escuro em todas as secções

**Passos:**

1. Selecciona o tema **Escuro**.
2. Navega pelas mesmas secções.

**O que deve acontecer:**

- O fundo é escuro em todas as secções.
- O texto é claro e legível.
- Não há áreas com fundo muito claro que "quebrem" o tema.

---

### T21 — Idiomas

> **Objetivo:** Verificar a tradução em alguns idiomas seleccionados.

---

#### T21-01 — Verificar inglês

**Passos:**

1. Altera o idioma para **English**.
2. Navega por: Biblioteca → Fila → Definições.
3. Verifica os menus e botões.

**O que deve acontecer:**

- Todos os textos estão em inglês.
- Nenhum texto aparece em formato de código.

---

#### T21-02 — Verificar francês

**Passos:**

1. Altera o idioma para **Français**.
2. Navega pelas mesmas secções.

**O que deve acontecer:**

- Textos principais em francês.
- Nenhum texto em formato de código.

---

#### T21-03 — Verificar alemão

**Passos:**

1. Altera o idioma para **Deutsch**.
2. Navega pelas mesmas secções.

**O que deve acontecer:**

- Textos principais em alemão.
- Caracteres especiais (Ä, Ö, Ü, ß) são mostrados correctamente.

---

#### T21-04 — Regressar a Português

**Passos:**

1. Altera de volta para **Português**.
2. Confirma que toda a interface voltou ao português.

---

## 5. Glossário

Termos técnicos explicados de forma simples:

| Termo              | Explicação                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VMAF**           | Pontuação de qualidade de vídeo de 0 a 100. Acima de 85 = boa qualidade. Abaixo de 70 = qualidade degradada. Criado pela Netflix.                 |
| **LUFS**           | Medida do volume do áudio. -23 LUFS é o padrão para televisão. Valores mais negativos = mais silencioso.                                          |
| **Codec**          | Tecnologia usada para comprimir vídeo ou áudio. H.264 é o mais comum (usado no YouTube, Netflix, etc.).                                           |
| **Pipeline**       | As 8 etapas automáticas que a app executa em cada ficheiro: análise, verificação, conversão, áudio, proxy, miniatura, verificação final, entrega. |
| **Proxy**          | Uma cópia de baixa qualidade do vídeo usada para pré-visualização rápida, sem carregar o ficheiro completo.                                       |
| **QC**             | Controlo de Qualidade — verificações automáticas que a app faz antes e depois de processar para garantir que o resultado é bom.                   |
| **GPU**            | Placa gráfica do computador. Quando disponível, a app usa-a para acelerar a conversão de vídeo (até 10× mais rápida).                             |
| **Transcodificar** | Converter um vídeo de um formato/qualidade para outro. Por exemplo, de `.mov` para `.mp4` com resolução 1080p.                                    |
| **Quarentena**     | Estado em que a app colocou um ficheiro porque detectou um possível problema de qualidade. Precisas de aprovar ou rejeitar manualmente.           |
| **Perfil**         | Um conjunto de configurações predefinidas (resolução, qualidade, formato) para um tipo específico de saída, como "Broadcast HD" ou "Web HD".      |
| **Bitrate**        | A quantidade de dados usada para representar um segundo de vídeo. Mais alto = melhor qualidade mas ficheiro maior. Medido em Mbps.                |
| **FTP / SFTP**     | Protocolos para transferir ficheiros para servidores remotos. FTP é básico; SFTP é a versão segura (encriptada).                                  |
| **S3**             | Serviço de armazenamento da Amazon (e compatíveis como Wasabi, MinIO). Parecido com uma pasta online.                                             |
| **Log**            | Registo automático do que a app fez. Útil para perceber o que aconteceu quando algo correu mal.                                                   |
| **Cache**          | Ficheiros temporários guardados pela app para ser mais rápida. Podem ser apagados sem perder os teus vídeos ou configurações.                     |

---

## 6. Contactos e Suporte

**Reportar bugs:**

- Através da app: botão **?** → Reportar Bug
- GitHub Issues: [https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues](https://github.com/ideiasestrondosas-ctrl/nexora-desktop/issues)

**Documentação completa:**

- Manual do utilizador: `docs/USER_MANUAL.md` (na pasta da app)
- Guia visual: `docs/SCREEN_GUIDE.md`

**Versão testada:** v0.31.5-beta.1  
**Última actualização deste guia:** Junho 2026

---

_Obrigado por participares nos testes beta do Nexora Desktop. O teu feedback faz a diferença!_
