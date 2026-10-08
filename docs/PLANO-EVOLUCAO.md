# MrCode Game — Plano de Evolução

> Objetivo: transformar o "Game Lab" (hoje uma cidade 3D somente leitura) em um **portal operacional
> gamificado** do MrCodeAdmin — onde dá para *ver, navegar e operar* a software house — com a HUD e a
> experiência de navegação das referências (estilo "WareTrack").

---

## Status (07/10/2026)

> Correções feitas no backend (mr-code-admin) ao longo do caminho, ainda não commitadas lá:
> numeração de faturas (`FaturaDomainService.GerarProximoNumero`) e conflito de tracking do EF ao
> mover atividades (`KanbanDomainService.ReordenarAtividadesDaColuna`).

| Fase | Situação |
|---|---|
| 0 — Fundamentos | ✅ concluída |
| 1 — Nova HUD | ✅ concluída |
| 2 — Mundo 3D v2 | ✅ concluída (AO liga só quando o desempenho permite) |
| 3 — Operar pelo jogo | 🟡 cliente (criar/editar/ativar), projeto (criar), chamado (abrir/status/assumir) e fatura (pagar) prontos |
| 4 — Pátio do Kanban | ✅ concluída |
| 5 — Gamificação | ✅ concluída (derivada dos dados; sem tabela no backend) |
| 6 — Polimento | ✅ concluída (deploy automático fica a decidir) |

---

## 1. Onde estávamos (antes da Fase 0)

| Área | Estado atual |
|---|---|
| Stack | React 19 + Vite 8 + `@react-three/fiber` 9 + `drei` 10 + `postprocessing` + Zustand + Tailwind 4 |
| Dados | `cityStore.load()` busca 9 endpoints de uma vez; Kanban sob demanda. **Nenhuma escrita.** `http.ts` só tem `get`/`post` |
| Mundo | Cliente = prédio (altura ∝ valor do contrato, cor ∝ status), Projeto = canteiro de obras, 4 landmarks (Data Center, Banco, Universidade, Prefeitura), cidadãos andando |
| Layout | Grade `ceil(sqrt(n))` — **reorganiza a cidade inteira** quando entra um cliente novo |
| HUD | Ticker de saldo, barra de câmera (girar 90° / home), painel lateral por entidade com link "Abrir no MrCodeAdmin" |
| Visual | Tema escuro/neon, primitivas (box/cylinder), bloom |

### O que o MrCodeAdmin oferece e o jogo ainda não usa

| Módulo | Leitura no jogo | Escrita disponível na API (não usada) |
|---|---|---|
| Clientes | ✅ | `POST /Cliente`, `PUT /{id}`, `PATCH /{id}/status` |
| Projetos | ✅ (lista) | `POST`, `PUT`, marcos (`POST /{id}/marcos`, `PATCH .../concluir`), equipe (`POST`/`DELETE /{id}/equipe`), links, `PUT /{id}/producao` |
| Kanban | ✅ (quadro) | colunas (criar/renomear/mover/remover), atividades (criar/editar/**mover**/remover), comentários |
| Chamados | ✅ (lista) | `POST /interno`, `PATCH status`, `PATCH responsavel`, mensagens, **`POST /{id}/converter-atividade`** |
| Contratos | ✅ | `POST`, `PUT`, `POST /{id}/enviar`, `PATCH status` |
| Faturas | ✅ | `POST`, `PUT`, `pagar`, `estornar`, `cancelar`, `gerar-recorrentes` |
| Despesas | ✅ | `POST`, `PUT`, `pagar`, `estornar`, `gerar-recorrentes` |
| Wiki | ✅ (títulos) | `POST`, `PUT`, `DELETE`, upload de imagem |
| Equipe | ✅ | `POST`, `PUT`, `PATCH ativo` (**somente ADMIN**) |
| Notificações | ❌ | `GET /minhas`, `PATCH /{id}/lida`, `PATCH /lida-todas` |
| Dashboard | ❌ | `GET /Dashboard/resumo` (chamados por status, projetos ativos/atrasados, contratos a vencer, série 6 meses) |
| Observabilidade | ✅ (resumo) | `GET /historico` (não usado) |

---

## 2. Linguagem visual alvo (a partir das referências)

### 2.1 Anatomia da HUD

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [🔍 Buscar clientes, projetos…  /] [CL-03 ▾] [Lista] [+ − ↺ ↻ ⌂ ⚒] ☀84 🔔 [Avatar] │  ← TopBar
├──────────────────────────────────────────────────────────────────────────────┤
│ [KPI] [KPI] [KPI]                                              ┌─────────────┐ │
│                                                                │ INSPECTOR   │ │
│                 MUNDO 3D (isométrico, claro)                   │ tipo · local│ │
│     rótulos ancorados · pins · colchetes de seleção            │ status chip │ │
│                                                                │ barra prog. │ │
│                                                                │ chave/valor │ │
│                                                                └─────────────┘ │
│ ┌─ Timeline (ciclo de vida) ────────────┬─ card atual ┐  ┌─ Celular ─────────┐ │
│ │ ●──●──◉──○──○                         │ #MC-…  ▸     │  │ Chamados │ Chat   │ │
│ └───────────────────────────────────────┴──────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tradução de cada elemento para o domínio MrCode

| Referência (WareTrack) | No MrCode Game | Fonte de dados |
|---|---|---|
| Busca global com atalho `/` | Command palette: clientes, projetos, chamados, faturas, wiki, pessoas → seleciona e voa até a entidade | store local (já carregado) |
| Seletor de site "WH-01 Riverside Hub · 78% full · 1/2 docked" | **Seletor de distrito**: Visão geral · cada cliente (`CL-03 Clínica Vida · 2 projetos · 1 chamado`) · Centro Financeiro · Campus (Wiki) · Data Center · Prefeitura (Contratos) | derivado |
| "Live 09:40" | Virou o **relógio e o wifi do celular** (barra de status). Na barra superior sobrou só o chip "Reconectando", que aparece quando a sincronização falha | React Query |
| Controles de câmera | Zoom, girar, visão geral e construir: na barra a partir de 1024px; abaixo disso, barrinha vertical flutuante | — |
| Sino com badge | Notificações reais, marcar como lida / todas | `/Notificacao/*` |
| KPI cards (Stock on hand, Trucks on site, On-time delivery) | **Saldo do mês**, **Chamados abertos**, **Projetos ativos / atrasados** (com delta) — contextuais ao distrito selecionado | `/Dashboard/resumo`, `/Financeiro/resumo` |
| Barra vertical de câmera (+ − ⟲ ⟳ ⌂) | Mesma barra, à direita, ao lado do inspector | CameraControls |
| Inspector (FORKLIFT · WH-01 / FL-01 / chip "Loading truck" / bateria / chave-valor / ações ⌖ ↗ ✕) | Inspector por tipo: Cliente, Projeto, Chamado, Colaborador, Atividade, Fatura, Landmark. Ações: **⌖ seguir/focar**, **↗ abrir no MrCodeAdmin**, **✕ fechar** + **ações de escrita** (ver Fase 3) | store |
| Shipment Tracking (stepper) | **Timeline de ciclo de vida** da entidade selecionada: Chamado (Aberto → Em andamento → Resolvido → Fechado), Contrato (Rascunho → Aguardando → Ativo → Encerrado), Fatura (Emitida → Vencimento → Paga), Projeto (marcos) | DTOs (*histórico por etapa não existe no backend → ver §7*) |
| Tabela Docks / Forklifts / Trucks | Abas contextuais: no overview **Chamados · Projetos · Faturas**; num cliente **Projetos · Chamados · Contratos**; num projeto **Atividades · Equipe · Marcos**. Clique = voa até o objeto | store |
| Rótulo flutuante "FL-01 Loading truck" | Rótulos `Html` ancorados em pessoas/veículos/canteiros, com status curto | drei `Html` |
| Pins azuis em pallets | Pins em entidades que pedem atenção (chamado alta prioridade, fatura atrasada, marco vencendo) | derivado |
| Colchetes de seleção no chão ("In 2 · Booked") | Colchetes animados ao redor do lote/objeto selecionado + etiqueta | drei `Line` |
| Faixas tracejadas no chão | Zonas do Kanban, vagas, limites de lote | drei `Line dashed` |
| Caminhões entrando/saindo | **Chamados chegam como caminhões** vindos do sistema de origem (LmLopes, TJCoach); **faturas pagas saem como carro-forte** até o Banco | animação por curva |
| Empilhadeiras carregando pallets | **Colaboradores** movendo **caixas (atividades)** entre zonas do Kanban | Kanban + equipe |

### 2.3 Estilo

- **Tema claro "maquete"** como padrão (fundo lavanda/branco, sombras suaves, azul `#134ced` como cor da marca),
  low-poly limpo, cantos arredondados. O tema escuro atual vira o **modo noite/alerta** (ver gamificação: clima).
- Cards em vidro: `bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(19,76,237,0.08)]`, chips de status
  coloridos suaves (verde "Operational", azul "En route", âmbar "Low stock").
- Tipografia: Inter (UI) + números tabulares; Fira Code só para códigos/protocolos.
- Câmera: perspectiva com FOV estreito (~30°) em ângulo isométrico (~35–45° de elevação), zoom de "visão de site" até "visão de objeto".

> **Nota:** a skill `ui-ux-pro-max` citada não está instalada neste ambiente. As diretrizes acima foram
> extraídas diretamente das referências enviadas; se a skill for instalada, ela pode ser usada na Fase 1
> para revisar tokens, contraste e espaçamentos.

---

## 3. Metáfora do mundo (v2)

| Entidade | Representação 3D | Estados visuais |
|---|---|---|
| **Cliente** | Lote com sede (galpão/prédio) + placa com código `CL-xx`; tamanho ∝ valor do contrato | cor do telhado por status do contrato; apagado se inativo; pin se tem chamado Alta |
| **Projeto** | Canteiro ao lado da sede do cliente → vira **anexo construído** quando `Concluido` | andaimes ∝ progresso; guindaste girando se EmAndamento; fita listrada se Pausado |
| **Kanban do projeto** | Ao entrar no projeto: **pátio com zonas** (uma por coluna), atividades = **caixas/pallets** coloridos por tipo (Tarefa/Bug/Melhoria/Chamado) | coluna de conclusão = zona de "expedição" |
| **Colaborador** | Personagem/empilhadeira com rótulo; anda até o projeto onde está alocado; carrega a caixa da atividade pela qual é responsável | parado/ocupado |
| **Chamado** | Caminhão com logo do sistema de origem estacionado na doca do cliente | Aberto = chegando/esperando; EmAndamento = descarregando; Resolvido/Fechado = vai embora |
| **Contrato** | Pergaminho/selo na **Prefeitura**; contratos ativos = bandeiras nos lotes | aguardando aprovação = pin âmbar |
| **Fatura** | Fila no **Banco Central**; paga = carro-forte entrando no cofre | atrasada = pin vermelho no lote do cliente |
| **Despesa** | Saída de moedas do Banco | — |
| **Wiki** | **Universidade/Biblioteca**; cada página = livro na estante | recém-atualizada brilha |
| **Observabilidade** | **Data Center** com racks; luzes por CPU/mem/disco | crítico = fumaça/alarme |

---

## 4. Arquitetura técnica

### 4.1 Camada de dados
- Adotar **`@tanstack/react-query`** para estado de servidor (cache por recurso, `refetchInterval` para o "Live",
  mutações com **atualização otimista** e invalidação). Zustand fica só com estado de **UI/cena**
  (seleção, distrito, câmera, modo construção, gamificação local).
- `http.ts`: adicionar `put`, `patch`, `delete` e tratamento de erros de validação (`errors[]` do `ApiResponse`).
- `src/api/*`: um arquivo por módulo (`clientes.ts`, `projetos.ts`, `kanban.ts`, …) com queries + mutations tipadas.
- Tipos de escrita espelhando os DTOs do backend (`CadastroClienteDTO`, `CadastroAtividadeDTO`, `MoverAtividadeDTO`…).
- Formulários: **`react-hook-form` + `zod`** (validação espelhando o backend: CNPJ, e-mail, valores).
- Permissões: ler `usuario.tipoUsuario`; esconder ações ADMIN (equipe) para STAFF.

### 4.2 Mundo e cena
- **Layout estável**: lotes alocados em espiral pela ordem de `idCliente` (append-only) — cliente novo ocupa o
  próximo lote livre, nada se move. Mesma ideia para canteiros dentro do lote.
- Estrutura: `world/` (funções puras de layout/saúde, testáveis), `scene/` (componentes 3D), `hud/` (DOM).
- **Performance**: `Instances`/`Merged` do drei para caixas, árvores, cones e postes; `Bvh` para raycast;
  `PerformanceMonitor` + `AdaptiveDpr`; modelos GLTF com `gltfjsx --transform` (Draco/meshopt) e `useGLTF.preload`.
- **Visual**: `hemisphereLight` + direcional com `SoftShadows`/`ContactShadows`, `Environment` com lightformers,
  `N8AO` (oclusão), `SMAA`, seleção com `Outlines` do drei.
- **Animação**: `maath/easing` (já vem com o drei) para transições; veículos em `CatmullRomCurve3` por rotas da malha viária.
- **Assets**: começar procedural (o estilo das referências é simples/boxy) e trazer GLTF CC0 (Kenney / Quaternius)
  só para veículos, empilhadeiras e pessoas.

### 4.3 Navegação
- `CameraControls`: voar até a entidade com `fitToBox`, **modo seguir** (alvo trava num objeto em movimento — botão ⌖),
  bookmarks por distrito, limites de pan.
- Teclado: `WASD`/setas = pan, `Q`/`E` = girar 90°, `+`/`−` = zoom, `/` = busca, `Esc` = desselecionar,
  `B` = modo construção, `1..5` = distritos.
- **Estado na URL** (`?d=cl-3&sel=projeto:2`) para links diretos e voltar/avançar do navegador.

### 4.4 Qualidade
- `vitest` para `world/*` (layout, saúde, XP); Playwright para fluxo login → selecionar → criar.
- `tsc -b` e `oxlint` no CI.

---

## 5. Roadmap por fases

Cada fase entrega algo utilizável. Estimativas para um dev full-time.

### Fase 0 — Fundamentos (≈ 3–4 dias)
- [x] React Query + migração do `cityStore.load()` para queries por recurso (`api/queries.ts`, `hooks/useWorld.ts`)
- [x] `http.put/patch/delete` + tipos de escrita + erros de validação por campo (`ApiError.fieldErrors`)
- [x] Layout estável — grade de colunas fixas por ordem de `idCliente` (`world/layout.ts`)
- [x] Tokens do tema claro em `index.css` (`@theme` do Tailwind 4); o escuro virou só o tom de alerta da cena
- [x] Estrutura `hud/`, `scene/`, `world/`, `api/`; `vitest` configurado (`npm test`)
- **Pronto quando:** app igual ao de hoje, porém com dados via React Query e criar cliente não reorganiza a cidade.

### Fase 1 — Nova HUD (≈ 1 semana)
- [x] **TopBar**: logo, busca (`/`), seletor de distrito, Live + relógio, sino de notificações, avatar/papel/sair
- [x] **KPI cards** contextuais (Dashboard/Financeiro resumo; trocam para o cliente selecionado)
- [x] **Barra de câmera vertical** (+ − ⟲ ⟳ ⌂ + modo construção)
- [x] **Inspector v2** com cabeçalho (tipo · local), chip de status, barra de progresso, chave/valor, ações ⌖ ↗ ✕
- [x] **Timeline** de ciclo de vida (chamado/contrato/fatura/projeto)
- [x] **Tabela por abas** contextual com clique → voar
- [x] Notificações: listar, marcar lida, marcar todas, clicar → voa até o chamado
- **Pronto quando:** toda a navegação da referência funciona sobre os dados reais (ainda só leitura + notificações).

### Fase 2 — Mundo 3D v2 (≈ 1–2 semanas)
- [x] Estilo claro "maquete": chão, ruas, lotes, árvores instanciadas, iluminação física calibrada — AO pendente
- [x] Sedes de cliente, canteiros (com anexo quando concluído), landmarks redesenhados no novo estilo
- [x] Rótulos ancorados, pins de atenção, colchetes de seleção, realce no hover
- [x] Caminhões de chamado (chegada/descarga/saída) e carro-forte de fatura paga
- [x] Colaboradores com rotas até os projetos alocados (quem tem atividade aberta no quadro)
- [x] Modo "seguir" da câmera (caminhões e colaboradores) e oclusão ambiente (N8AO) adaptativa
- [x] Voar até a seleção, atalhos de teclado, estado na URL (`?sel=cliente:3`)
- **Pronto quando:** visualmente próximo das referências e a 60 fps num MacBook Air.

### Fase 3 — Operar pelo jogo: inclusão e edição (≈ 2 semanas)
Padrão de interação: **ação no Inspector ou no menu de construção → drawer de formulário à direita → mutação otimista
→ animação de feedback na cena → XP (Fase 5)**.

Já implementado: construir sede (modo construção `B`), editar e ativar/desativar cliente, abrir canteiro (projeto),
abrir chamado interno, iniciar/resolver/fechar/reabrir e assumir chamado (otimista), registrar pagamento de fatura.

| Ação no jogo | Endpoint | Feedback na cena |
|---|---|---|
| **Construir sede** (modo construção `B`: escolher lote vazio → fantasma do prédio → formulário) | `POST /Cliente` | prédio "sobe" do chão |
| Editar / desativar cliente | `PUT /Cliente/{id}`, `PATCH status` | luzes apagam / reacendem |
| **Abrir canteiro** no lote do cliente | `POST /Projeto` | cercas + guindaste montando |
| Mudar status/prioridade do projeto, entregar marco | `PUT /Projeto/{id}`, `POST`/`PATCH marcos` | bandeira no marco, andaime cresce |
| Alocar/remover colaborador | `POST`/`DELETE /Projeto/{id}/equipe` | personagem caminha até o canteiro |
| Marcar projeto em produção (links) | `PUT /{id}/producao`, `POST links` | anexo "inaugurado" com fogos |
| **Abrir chamado interno** | `POST /Chamado/interno` | caminhão chega na doca |
| Assumir / mudar status / responder chamado | `PATCH responsavel`, `PATCH status`, `POST mensagens` | caminhão descarrega / parte |
| **Converter chamado em atividade** | `POST /Chamado/{id}/converter-atividade` | caixa sai do caminhão e vai ao pátio do projeto |
| Criar contrato, enviar para aprovação, mudar status | `POST`/`PUT /Contrato`, `POST enviar`, `PATCH status` | selo na Prefeitura; bandeira no lote |
| Emitir fatura, **pagar**, estornar, cancelar | `POST /Fatura`, `PATCH pagar/estornar/cancelar` | carro-forte vai ao Banco; moedas |
| Lançar / pagar despesa | `POST /Despesa`, `PATCH pagar` | moedas saem do cofre |
| Gerar recorrentes do mês | `POST .../gerar-recorrentes` | fila de faturas no Banco |
| Escrever página da wiki (texto simples; rico abre no Admin) | `POST`/`PUT`/`DELETE /Wiki` | livro aparece na estante |
| **Contratar colaborador** (ADMIN) / ativar-inativar | `POST /UsuarioAdmin`, `PATCH ativo` | cidadão chega de ônibus / vai embora |

Fora de escopo no jogo (continua via "↗ Abrir no MrCodeAdmin"): editor rico da wiki com imagens, página
pública de aprovação de contrato.

### Fase 4 — Pátio do Kanban interativo (≈ 1 semana)
- [x] Entrar no projeto (duplo clique no canteiro, botão no inspector ou `?yard=<id>`) → pátio com uma zona por coluna e armazém com docas
- [x] **Arrastar caixas entre zonas** → `PATCH /Kanban/atividades/{id}/mover` (otimista, com rollback; espelho testado da regra do backend)
- [x] Alternativa sem arraste: "Mover para a zona" no inspector (teclado/acessibilidade)
- [x] Criar atividade (caixa nova na zona), editar, comentar, remover
- [x] Criar/renomear/reordenar/remover colunas (zonas)
- [x] Responsável = empilhadeira que segue a caixa em que está trabalhando; concluir = caixa vai para a expedição com confete
- [x] Converter chamado em atividade ("o caminhão descarrega" direto no pátio)
- **Pronto quando:** dá para tocar a sprint de um projeto sem abrir o Angular.

### Fase 5 — Gamificação (≈ 1–2 semanas)
| Mecânica | Regra inicial | Persistência |
|---|---|---|
| **XP por ação** | resolver chamado +50 (×2 se Alta), concluir atividade +20, pagar fatura +30, novo cliente +100, contrato ativo +150, página wiki +15 | backend (§7); v0 local |
| **Nível da cidade** | soma de XP da equipe → desbloqueia decoração (praça, parque, monumento, skyline) | derivado |
| **Saúde da cidade (0–100)** | chamados Alta abertos, faturas atrasadas, projetos atrasados, VPS → **clima**: sol / nublado / chuva / noite com alarme | derivado (já existe `isSystemAlert`) |
| **Missões diárias/semanais** | "Zere os chamados Alta", "Receba 3 faturas", "Entregue um marco" — painel de missões na HUD | derivado + backend |
| **Conquistas** | "Primeiro deploy", "Inbox zero", "Mês no azul", "100 atividades" — toasts + vitrine no perfil | backend |
| **Ranking da equipe** | XP semanal por colaborador (opt-in) | backend |
| **Juice** | partículas, sons curtos (com toggle), contagem animada nos KPIs (`useCountUp` já existe), confete ao subir de nível | — |

**Implementado (07/10/2026), tudo derivado dos dados reais em `world/gamification.ts` (testado):**
- [x] XP por resultado (clientes ativos, contratos, projetos entregues, chamados resolvidos por prioridade, atividades
      entregues, faturas pagas por valor, artigos) — reabrir um chamado remove o XP dele automaticamente
- [x] Nível da cidade (limiar 150·n·(n−1)) com 7 construções desbloqueáveis na cena (fonte → monumento)
- [x] Saúde 0–100 → clima na cena (sol / nublado / chuva / tempestade com relâmpagos e alerta)
- [x] 6 missões semanais, 12 conquistas (guardadas por usuário no navegador), ranking semanal da equipe
- [x] Feedback: toasts "+XP · categoria", celebração de nível (inclusive "enquanto você estava fora"), sons opcionais
- Persistência no backend (§7) continua opcional: hoje conquistas ficam no localStorage de cada navegador.

Cuidados: XP nunca deve incentivar ação errada (ex.: fechar chamado sem resolver) — premiar **resultado**
(ex.: chamado fechado sem reabertura em 7 dias) e não volume bruto.

### Fase 6 — Polimento (contínuo)
- [x] Onboarding guiado (tour de 5 passos na primeira vez; revisível pelo menu)
- [x] Responsivo: no celular, inspector vira bottom sheet e há barra de ações ao alcance do polegar
- [x] Acessibilidade: modo lista 2D (tecla L; fallback sem WebGL), foco visível, diálogos rotulados,
      contraste AA, movimento reduzido (sistema ou menu)
- [x] Orçamento de performance (`?perf`; ≤ 450 draw calls) e code-splitting (login ≈ 85 KB gzip)
- [x] Testes E2E (Playwright, 6 testes somente leitura) e CI (lint, tipos, unit, build)
- [x] Build em subcaminho (`VITE_BASE=/city/`) + snippet Nginx
- [x] Ruas com os ladrilhos do kit de estradas da Kenney (no lugar dos planos coloridos) e prédios
      cívicos do kit industrial — Data Center vira o tanque, Banco e Prefeitura trocam de modelo
      (ver MANUAL-TECNICO §9.6)
- [x] Placas com o nome de cada construção (totem que acompanha a câmera) nos landmarks e nas sedes;
      somem ao afastar a câmera e têm chave no menu do usuário (MANUAL-TECNICO §9.7)
- [x] Campo com bosque em volta da cidade no lugar do chão branco; a cidade passa a ficar num tapete
      claro (MANUAL-TECNICO §9.8)
- [x] **Celular do atendimento** no lugar da tabela de abas: fila de chamados com filtros e três abas
      (abertos, em andamento, fechados), detalhe do chamado e chat com o cliente — uma conversa por
      cliente, montada a partir das threads de `/Chamado/{id}/mensagens`. Converter chamado em tarefa
      passou a exigir prazo, que vira mensagem automática no chat (MANUAL-TECNICO §10.1)
- [x] Barra superior enxuta: sai o chip "Live" (o relógio e a sincronização vivem no celular; sobra o
      alerta "Reconectando") e entram os controles de câmera na horizontal, a partir de 1024px
      (MANUAL-TECNICO §10.2)
- [ ] Deploy automático (incluir no `cd.yml` do MrCodeAdmin? — decisão de infraestrutura)

---

## 6. Ordem sugerida das primeiras entregas

1. Fase 0 completa
2. Fase 1: TopBar + KPIs + Inspector v2 + notificações
3. Fase 3 parcial: **criar cliente (construir sede)** e **mudar status de chamado** — prova o ciclo
   ação → mutação → animação
4. Fase 2: estilo claro + veículos
5. Fase 4 (Kanban) → Fase 5 (gamificação) → restante da Fase 3

---

## 7. Dependências no backend (mr-code-admin)

| Necessidade | Motivo | Proposta |
|---|---|---|
| Histórico de status (chamado, contrato, fatura) | Timeline com horário por etapa (como no "Shipment Tracking") | tabela `historico_status` (entidade, id, de, para, data, usuário) gravada nos domain services |
| Gamificação persistente | XP, conquistas e missões entre sessões e entre pessoas | tabelas `gamificacao_evento`, `gamificacao_conquista` + `GET /Gamificacao/resumo`, `GET /ranking` |
| CORS para `localhost:5173` | hoje resolvido com proxy do Vite em dev; em produção servir sob o mesmo domínio | nada a fazer se o deploy for no mesmo host |
| Mock de observabilidade em dev | Data Center sem dados localmente | flag `Observabilidade:Mock=true` que gera amostras sintéticas |
| Tempo real (opcional) | "Live" de verdade em vez de polling | hub SignalR emitindo eventos de domínio |

---

## 8. Decisões em aberto

1. **Tema claro como padrão?** As referências são claras; a recomendação é claro por padrão e escuro como noite/alerta.
2. **Gamificação no backend já na Fase 5** ou começar com XP derivado só no front?
3. **Escopo de edição no jogo**: o plano mantém wiki rica e aprovação pública no Angular — ok?
4. **Assets**: procedural + GLTF CC0, ou haverá um designer 3D para modelos próprios?
