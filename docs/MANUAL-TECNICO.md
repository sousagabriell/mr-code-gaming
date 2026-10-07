# MrCode City — Manual Técnico

Painel operacional **gamificado** do MrCodeAdmin. Os dados reais da software house (clientes, projetos,
chamados, financeiro, wiki, equipe) viram uma cidade 3D navegável onde também é possível **operar**:
criar, editar e mover registros pela própria cena.

> Documento vivo. Para o histórico de decisões e o que falta fazer, veja [PLANO-EVOLUCAO.md](PLANO-EVOLUCAO.md).

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack e dependências](#2-stack-e-dependências)
3. [Como rodar](#3-como-rodar)
4. [Arquitetura](#4-arquitetura)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Camada de dados](#6-camada-de-dados)
7. [Estado da interface](#7-estado-da-interface)
8. [Mundo e regras puras](#8-mundo-e-regras-puras)
9. [Cena 3D](#9-cena-3d)
10. [HUD](#10-hud)
11. [Funcionalidades do sistema](#11-funcionalidades-do-sistema)
12. [Gamificação](#12-gamificação)
13. [Referência de API](#13-referência-de-api)
14. [Atalhos e navegação](#14-atalhos-e-navegação)
15. [Testes e qualidade](#15-testes-e-qualidade)
16. [Convenções e armadilhas conhecidas](#16-convenções-e-armadilhas-conhecidas)
17. [Limitações e roadmap](#17-limitações-e-roadmap)
18. [Referências externas](#18-referências-externas)

---

## 1. Visão geral

| Aspecto | Descrição |
|---|---|
| Tipo | SPA React (Vite) com cena 3D em WebGL (React Three Fiber) |
| Backend | **Nenhum próprio.** Consome a API do **MrCodeAdmin** (.NET 8) — mesma conta e mesmos dados do painel Angular |
| Persistência local | Só preferências e conquistas no `localStorage` (por usuário, por navegador) |
| Idioma da UI | Português (Brasil) |
| Perfis | `ADMIN` e `STAFF`; a lista de equipe só carrega para `ADMIN` |

### Metáfora do mundo

| Entidade do MrCodeAdmin | Representação |
|---|---|
| Cliente | Lote com **sede**; telhado colorido pelo status do contrato |
| Projeto | **Canteiro de obras** no lote (vira anexo inaugurado quando concluído); entrar nele abre o **pátio de obras** |
| Atividade (Kanban) | **Caixa** num palete dentro do pátio; cada coluna é uma **zona** |
| Chamado | **Caminhão** na porta do cliente (chega, descarrega, vai embora) |
| Fatura paga | **Carro-forte** até o Banco Central |
| Colaborador | **Pedestre** caminhando até o canteiro / **empilhadeira** no pátio |
| Observabilidade | **Data Center** |
| Financeiro | **Banco Central** |
| Wiki | **Universidade** |
| Contratos e equipe | **Prefeitura** |

---

## 2. Stack e dependências

| Camada | Tecnologia | Papel |
|---|---|---|
| Build | Vite 8, TypeScript 6 (`erasableSyntaxOnly`, `verbatimModuleSyntax`) | Dev server, bundling, tipos |
| UI | React 19, Tailwind CSS 4 (`@theme`), lucide-react | Componentes e ícones |
| 3D | three 0.186, `@react-three/fiber` 9, `@react-three/drei` 10, `@react-three/postprocessing` 3, `maath` | Cena, controles de câmera, efeitos, easing |
| Dados | `@tanstack/react-query` 5 | Cache, refetch periódico, mutações otimistas |
| Estado de UI | zustand 5 | Seleção, câmera, drawer, pátio, jogo, toasts |
| Formulários | react-hook-form + zod 4 + `@hookform/resolvers` | Validação no cliente |
| Qualidade | vitest 5, oxlint | Testes unitários e lint |
| Fonte | `@fontsource-variable/inter` | Tipografia da UI |

---

## 3. Como rodar

### Pré-requisitos

- Node.js 20+ e npm
- Backend do MrCodeAdmin rodando (por padrão em `http://localhost:5200`)

### Backend (repositório `mr-code-admin`)

```bash
cd mr-code-admin/backend && docker compose up -d          # MySQL na porta 3306
cd Api && ASPNETCORE_ENVIRONMENT=Development \
  dotnet run --no-launch-profile --urls http://localhost:5200
```

> **`ASPNETCORE_ENVIRONMENT=Development` é obrigatório**, senão a API sobe como Production e usa a
> política de CORS de produção. A API aplica migração e seed na primeira subida.

### Frontend

```bash
npm install
npm run dev        # http://localhost:5173 (porta fixa: strictPort)
```

### Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Vite com HMR |
| `npm run build` | `tsc -b` + build de produção em `dist/` |
| `npm run preview` | Serve o build |
| `npm run lint` | oxlint (meta: zero avisos) |
| `npm test` | vitest (uma execução) |

### Como o front fala com a API

`src/config/environment.ts` usa sempre `apiUrl = '/api'`. Em desenvolvimento o **proxy do Vite**
([vite.config.ts](../vite.config.ts)) repassa `/api` para `http://localhost:5200`, o que dispensa CORS
(o CORS de dev do backend só libera `localhost:4400`, a porta do Angular). Para apontar para outro backend:

```bash
VITE_API_PROXY_TARGET=http://outro-host:5200 npm run dev
```

Em produção o app deve ser servido sob o mesmo domínio da API (`/api`).

---

## 4. Arquitetura

```
┌───────────────────────────── Navegador ─────────────────────────────┐
│                                                                      │
│   HUD (DOM / React)                    Cena 3D (R3F / WebGL)         │
│   TopBar · KPIs · Inspector            City ⇄ KanbanYard             │
│   Drawer · Painel do jogo              Veículos · Pedestres · Clima  │
│        │            ▲                         │          ▲           │
│        │ select()   │ lê                      │ lê       │ onClick   │
│        ▼            │                         ▼          │           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Zustand: uiStore · gameStore · toastStore · cityEvents       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│        │                                                             │
│        ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ React Query (cache + polling 30s + mutações otimistas)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│        │  api/endpoints.ts → lib/http.ts (fetch + JWT)               │
└────────┼─────────────────────────────────────────────────────────────┘
         ▼  /api  (proxy Vite em dev)
   MrCodeAdmin API (.NET 8 + MySQL)
```

### Princípios

1. **Estado do servidor ≠ estado de UI.** Tudo que vem da API vive no React Query; Zustand guarda só
   seleção, câmera, formulários abertos, modo pátio, progresso do jogo e toasts.
2. **Regras em funções puras.** Layout, rotas, status, ciclo de vida, Kanban e gamificação ficam em
   `src/world/` sem React nem three — são o que os testes cobrem.
3. **A cena não busca dados.** Componentes 3D leem hooks (`useWorld`, `useCityLayout`, `useGame`) e
   disparam ações via stores; quem chama a API são as mutações.
4. **Atualização otimista com espelho testado.** Mover caixa e mudar status de chamado alteram o cache na
   hora e fazem rollback se a API recusar. A lógica local espelha a do backend (`moveAtividade`).
5. **Animações por diferença de dados.** Caminhão que some, fatura que vira "Pago" e XP ganho são
   detectados comparando o estado anterior com o novo — não existem eventos no backend.
6. **Derivado sempre que possível.** Gamificação, clima e posição de tudo são recalculados dos dados.

### Fluxo de uma ação (exemplo: "Iniciar atendimento" num chamado)

1. `ChamadoInspector` chama `useAlterarStatusChamado().mutate({id, status})`.
2. `onMutate`: cancela refetch, guarda o cache anterior, aplica o novo status em `qk.chamados`.
3. A cena e a HUD re-renderizam na hora (caminhão abre a porta, timeline avança).
4. `PATCH /Chamado/{id}/status`. Erro → restaura o cache + toast.
5. `onSettled`: invalida `chamados`, `notificacoes` e `dashboard` → refetch confirma.
6. `useGameProgress` detecta variação de XP e mostra o toast "+XP".

---

## 5. Estrutura de pastas

```
src/
├── main.tsx                 # Providers (React Query), fonte, CSS
├── App.tsx                  # Login ⇄ Game; layout da HUD
├── index.css                # Tokens Tailwind (@theme), animações globais
├── config/environment.ts    # apiUrl, adminUrl
│
├── api/
│   ├── endpoints.ts         # Chamadas cruas por módulo (objeto `api`)
│   ├── queries.ts           # Hooks de leitura (useQuery) + useAllKanbans
│   ├── mutations.ts         # Mutações de clientes, projetos, chamados, faturas, notificações
│   ├── kanban.ts            # Queries/mutações do Kanban (mover otimista, zonas, comentários, converter)
│   └── queryClient.ts       # QueryClient, intervalo do "Live", chaves (`qk`)
│
├── lib/
│   ├── http.ts              # fetch com JWT, ApiError, normalização de erros
│   ├── format.ts            # moeda, datas, stripHtml, textToHtml
│   ├── useCountUp.ts        # Animação numérica dos KPIs
│   └── sfx.ts               # Efeitos sonoros sintetizados (WebAudio)
│
├── types/
│   ├── api.ts               # ApiResponse, FieldError, login
│   └── domain.ts            # DTOs de leitura e de escrita
│
├── store/
│   ├── authStore.ts         # Token e usuário (localStorage)
│   ├── uiStore.ts           # Seleção, câmera, drawer, pátio, follow — espelhado na URL
│   ├── gameStore.ts         # Painel do jogo, celebração, som, progresso salvo
│   ├── toastStore.ts        # Notificações efêmeras
│   └── cityEvents.ts        # Animações passageiras (caminhão saindo, carro-forte)
│
├── hooks/
│   ├── useWorld.ts          # Todos os dados da cidade + useCityLayout
│   ├── useDistricts.ts      # Seletor de distrito; contextClienteId
│   ├── useYard.ts           # Pátio aberto (projeto + quadro + layout)
│   ├── useGame.ts           # XP, nível, saúde, missões, ranking, conquistas
│   ├── useGameProgress.ts   # Observa o jogo e gera toasts/celebrações
│   ├── useKeyboardShortcuts.ts
│   └── useNow.ts            # "Agora" como estado (evita Date.now() no render)
│
├── world/                   # Regras puras (testadas)
│   ├── layout.ts            # Grade de lotes, canteiros, caminhões, ruas
│   ├── routes.ts            # Caminhos poligonais (carro-forte, pedestres)
│   ├── yard.ts              # Pátio do Kanban: zonas, vagas, drop
│   ├── kanban.ts            # moveAtividade (espelho do backend), estatísticas
│   ├── status.ts            # Tons, rótulos, códigos, progresso de projeto
│   ├── lifecycle.ts         # Etapas de chamado/contrato/fatura/projeto
│   ├── positions.ts         # Onde a câmera olha para cada entidade
│   ├── gamification.ts      # XP, níveis, saúde, missões, ranking, conquistas
│   ├── health.ts            # Saldo e saúde do banco / data center
│   └── colors.ts            # Paleta 3D
│
├── scene/                   # Componentes R3F
│   ├── CityScene.tsx        # Canvas, luz/céu, alterna City ⇄ KanbanYard, AO
│   ├── CameraRig.tsx        # Controles, limites, foco, seguir, enquadrar pátio
│   ├── Ground.tsx           # Chão, ruas, lotes, árvores instanciadas
│   ├── ClientBuilding.tsx · ConstructionSite.tsx · Landmark.tsx
│   ├── Citizens.tsx · Walkers.tsx
│   ├── CityDecor.tsx        # Construções desbloqueadas por nível
│   ├── Weather.tsx · weatherStyle.ts
│   ├── SceneTag.tsx · MapPin.tsx · SelectionMarker.tsx · BuildGhost.tsx
│   ├── labelsPortal.ts · movers.ts · useHover.ts
│   ├── vehicles/            # TruckModel, ChamadoTruck, EventVehicles, detector de eventos
│   └── yard/                # KanbanYard, Crate (arrastável), Forklift, crateColors
│
├── hud/                     # Componentes DOM
│   ├── TopBar · DistrictSelector · NotificationBell · SearchPalette
│   ├── KpiCards · CameraToolbar · TimelineTray · EntityTable
│   ├── FormDrawer · Toasts
│   ├── inspector/           # Inspector + um por tipo de entidade (incl. Atividade)
│   ├── forms/               # Cliente, Projeto, Chamado, Atividade, Coluna, ConverterChamado
│   ├── yard/                # YardPanel, YardTable
│   ├── game/                # GameChips, GamePanel, LevelUpOverlay, weatherMeta
│   ├── ui.tsx · tones.ts · camera.ts · useClickOutside.ts
│
└── components/LoginScreen.tsx
docs/
├── PLANO-EVOLUCAO.md        # Roadmap e status por fase
└── MANUAL-TECNICO.md        # Este documento
```

---

## 6. Camada de dados

### 6.1 Cliente HTTP (`lib/http.ts`)

- Prefixa `environment.apiUrl`, anexa `Authorization: Bearer <token>` (exceto `/Login`).
- **401** → `authStore.logout()` e `ApiError(401)`. **403** → `ApiError(403)` ("sem permissão").
- A API devolve `{ data, isSuccess, message, errors }`. **Erros de validação chegam com HTTP 200 e
  `isSuccess: false`**; `errors` é `[{ field, message }]`. `http.ts` converte tudo em `ApiError` com
  `fieldErrors`.
- Erros do middleware de exceções vêm em **PascalCase** (`IsSuccess`, `Message`); `normalizeCasing`
  uniformiza.
- Corpo vazio com status OK retorna `undefined` (DELETE/PATCH sem payload).

### 6.2 Endpoints (`api/endpoints.ts`)

Objeto `api` agrupado por módulo — `clientes`, `contratos`, `projetos`, `chamados`, `faturas`, `despesas`,
`wiki`, `equipe`, `kanban`, `notificacoes`, `dashboard`, `observabilidade`. Funções são finas
(`http.get/post/put/patch/delete`) e tipadas pelos DTOs de `types/domain.ts`.

### 6.3 Queries e atualização

- Polling global de **30 s** (`LIVE_INTERVAL_MS`) + refetch ao focar a janela. É o "Live" da barra superior.
- `useWorld()` combina 9 queries **independentes** (uma falha não derruba as demais) e devolve um objeto
  **memoizado** — pode ser dependência de `useMemo`. `isLoading`/`isError` consideram só clientes,
  contratos, projetos e chamados.
- `useEquipeQuery` só roda para `ADMIN` (o endpoint exige o papel).
- `useAllKanbans(projetos)` assina o quadro de todos os projetos não cancelados (cache compartilhado com o
  pátio) para pedestres e gamificação. `combine` com referência estável evita re-render em loop.
- Chaves em `qk` (`queryClient.ts`). Ao sair, `App` chama `queryClient.clear()`.

### 6.4 Mutações

| Hook | Endpoint | Otimista |
|---|---|---|
| `useCriarCliente`, `useAtualizarCliente`, `useAlterarStatusCliente` | `POST/PUT/PATCH /Cliente` | não |
| `useCriarProjeto` | `POST /Projeto` | não |
| `useCriarChamadoInterno` | `POST /Chamado/interno` | não |
| `useAlterarStatusChamado`, `useAtribuirResponsavel` | `PATCH /Chamado/{id}/status\|responsavel` | **sim** |
| `usePagarFatura` | `PATCH /Fatura/{id}/pagar` | não |
| `useMoverAtividade` | `PATCH /Kanban/atividades/{id}/mover` | **sim** (rollback) |
| `useReordenarColuna` | `PATCH /Kanban/colunas/{id}/mover` | **sim** |
| `useCriarAtividade`, `useAtualizarAtividade`, `useRemoverAtividade` | Kanban | não |
| `useCriarColuna`, `useRenomearColuna`, `useRemoverColuna` | Kanban | não |
| `useComentar` | `POST /Kanban/atividades/{id}/comentarios` | não |
| `useConverterChamado` | `POST /Chamado/{id}/converter-atividade` | não |
| `useMarcarNotificacaoLida`, `useMarcarTodasLidas` | `PATCH /Notificacao/...` | não |

Padrão de `useGameMutation`: toast de sucesso; em erro **de campo** não mostra toast (o formulário exibe
no campo); `onSettled` invalida os recursos afetados e o `dashboard`.

---

## 7. Estado da interface

### `uiStore` (a fonte de verdade da navegação)

| Campo | Significado |
|---|---|
| `selected: EntityRef \| null` | `cliente`, `projeto`, `chamado`, `fatura`, `colaborador`, `atividade` (só no pátio) ou um landmark |
| `focusNonce` | Incrementa a cada `select` — a câmera voa mesmo ao re-selecionar o mesmo alvo |
| `controls` | Instância do `CameraControls` (registrada pelo `CameraRig`) |
| `follow` | Câmera acompanhando um objeto móvel |
| `buildMode` | Fantasma de sede no próximo lote livre |
| `drawer` | Formulário aberto (`DrawerState`) |
| `yard` | Id do projeto cujo pátio está aberto; `null` = cidade |
| `dragging` | Uma caixa segura o ponteiro (câmera travada) |
| `searchOpen` | Paleta de busca |

**Sincronização com a URL** (`history.replaceState`): `?sel=cliente:3` e `?yard=3`. Permite link direto e
recarregar sem perder o foco. `select()` estando no pátio sai dele (exceto para `atividade`).

### Outros stores

- `authStore` — `mrcode_token` / `mrcode_usuario` no `localStorage`.
- `gameStore` — painel, aba, celebração, som (`mrcode-city:sound`), progresso por usuário
  (`mrcode-city:game:<id>` → `{achievements, level, xp}`). Todo acesso a storage é protegido por `try/catch`.
- `toastStore` — tons `ok | bad | info | xp`; some em 4 s (6 s para erro); máximo de 4 empilhados.
- `cityEvents` — fila de animações (`truck-leave`, `armored`) e a flag `ready`.

> Em dev, `window.__ui` e `window.__game` expõem os stores para testes de navegador (Playwright).

---

## 8. Mundo e regras puras

Tudo aqui é determinístico e testado em `src/world/*.test.ts`.

### 8.1 Layout (`layout.ts`)

- Grade de **4 colunas fixas** (`LOT_COLUMNS`), espaçamento 4,6. O lote de um cliente depende **só da
  posição na ordem de `idCliente`** → cliente novo ocupa o próximo lote livre e **nada se move**.
- Canteiros usam até 5 vagas por lote (`SITE_SLOTS`); projetos cancelados não aparecem.
- Altura da sede ∝ `log10(1 + valor do contrato)`; cor do telhado pelo contrato
  (`ativo` azul · `pendente` âmbar · `encerrado/neutro` cinza).
- **Caminhões:** até `MAX_TRUCKS_PER_LOT = 3` por sede, na rua à frente do lote, um por chamado aberto.
- Helpers de rua: `frontRoadZ`, `verticalRoadXs`, `nearestVerticalRoadX`, `AVENUE_Z`, `LANE_OFFSET`.

### 8.2 Rotas (`routes.ts`)

`Path = Vec3[]` poligonal. `pathLength`, `pointAt(path, d)` (posição + direção a uma distância).
`armoredRoute(lot, bank)` e `walkerRoute(plaza, site)` só geram segmentos **retos pelas ruas/calçadas**.

### 8.3 Pátio (`yard.ts`) e Kanban (`kanban.ts`)

- Uma **zona** por coluna (3,2 × 4,4), vagas em 3 × 4 e **empilhamento** quando lota (`slotPosition`).
- `zoneAt(x, z)` descobre a zona sob o ponteiro; `dropIndex` traduz o ponto solto em `novaOrdem`.
- `moveAtividade(colunas, id, destino, novaOrdem)` **espelha `KanbanDomainService.MoverAtividade`**:
  remove da origem, insere em `clamp(novaOrdem, 0, tamanho)`, renumera `ordem` das duas colunas e
  preenche/limpa `dataConclusao` conforme a coluna de conclusão. Preserva a referência das colunas não afetadas.

### 8.4 Status e ciclo de vida

- `statusTone(status)` → `ok | warn | bad | info | neutral`; `label()` traduz enums
  (`EmAndamento` → "Em andamento").
- `projetoProgress` é **tempo decorrido** entre início e previsão (o backend não tem % de conclusão).
- `lifecycle.ts` monta as etapas da linha do tempo; **a data de cada etapa só existe para a etapa atual**
  porque o backend não guarda histórico de status (ver §17).

### 8.5 Posições (`positions.ts`)

`entityPosition(ref, layout, data)` define onde a câmera olha: chamado aberto → caminhão; fechado → sede;
fatura → sede do cliente; landmarks → posição fixa. Entidades móveis são consultadas em tempo real via
`scene/movers.ts`.

---

## 9. Cena 3D

### 9.1 Canvas e iluminação (`CityScene.tsx`)

- `shadows="percentage"`, `flat` (sem tone mapping — mantém as cores da marca), `dpr` adaptativo
  (`PerformanceMonitor` + `AdaptiveDpr`).
- Luz **física** (three r155+): hemisfério + direcional; intensidades vêm de `weatherStyle.ts`.
- `Scene` = luz/céu/câmera/clima comuns; o conteúdo alterna entre `<City />` e `<KanbanYard />`.
- **N8AO** (oclusão ambiente) começa desligado e só liga quando o `PerformanceMonitor` confirma folga.
- Um contêiner DOM estável (`labelsPortal`) hospeda todos os `<Html>` do drei — sem ele o R3F troca o alvo
  das etiquetas e o React 19 reclama de desmontagem durante o render.

### 9.2 Câmera (`CameraRig.tsx`)

- Botão esquerdo = pan, direito = girar (preso entre `minPolarAngle 0.55` e `maxPolarAngle 1.05`),
  roda = zoom com `dollyToCursor`.
- Limites do pan = `bounds` da cidade (cresce com os lotes) ou do pátio.
- **Voar até a seleção** depende de `focusNonce` e da posição do alvo; o refetch periódico não "puxa"
  a câmera (a chave de posição não muda).
- **Seguir:** a cada frame `moveTo` o objeto registrado em `movers`; qualquer gesto manual
  (`controlstart`) desliga.
- Dentro do pátio: enquadra todas as zonas (`YARD_CAMERA`) e usa distância de foco maior.

### 9.3 Cidade

| Componente | Observações |
|---|---|
| `Ground` | Chão, praça, ruas com faixa tracejada, lotes, árvores/troncos em `Instances` |
| `ClientBuilding` | "Sobe do chão" ao aparecer; pin de atenção; etiqueta `CL-xx` |
| `ConstructionSite` | Estacas (planejamento), andaime ∝ progresso + guindaste, faixa (pausado), anexo (concluído); duplo clique entra no pátio |
| `Landmark` | Data Center, Banco, Universidade, Prefeitura; cor/pulso pela saúde |
| `ChamadoTruck` | Chega do oeste se o chamado surgiu na sessão; porta aberta em atendimento; giroflex se Alta |
| `EventVehicles` | `DepartingTruck` e `ArmoredTruck` (+ moedas) a partir de `cityEvents` |
| `Walkers` | Pedestres com rota pela calçada; fases `rest → go → work → back` em rodízio entre projetos |
| `CityDecor` | 7 construções por nível, com animação de "brotar" |
| `Weather` | Nuvens e chuva instanciadas; relâmpago via luz ambiente |

`useCityEventDetector` compara o estado anterior com o atual; a **primeira passada só registra** (nada anima
na carga inicial nem ao voltar do pátio).

### 9.4 Pátio de obras (`scene/yard/`)

- `KanbanYard`: armazém com uma doca por zona, zonas pintadas, `ZoneLabel` (renomear, reordenar ‹ ›,
  nova atividade), caixas e empilhadeiras.
- `Crate`: **arrasto** com `setPointerCapture`; plano do chão para converter o ponteiro em (x, z); limiar
  de 0,18 para distinguir clique de arrasto; fora de arrasto a caixa "anda" até a vaga.
  Entrar na zona de conclusão dispara confete.
- Enquanto uma caixa segura o ponteiro, `setCameraLocked(true)` **desabilita o `CameraControls`** — o
  camera-controls recebe o `pointerdown` antes do R3F e arrastaria o mapa junto.
- `Forklift`: empilhadeira por responsável, estacionada em frente à caixa em que ele trabalha.

### 9.5 Desempenho

Instancing (árvores, nuvens, chuva), sombras limitadas (mapa 2048, frustum ±26), DPR adaptativo e AO
adaptativo. Veja §17 para o que ainda falta (code-splitting, LOD).

---

## 10. HUD

Layout (`App.tsx`): topo = barra · esquerda = KPIs e painel do jogo · direita = câmera + inspector ·
base = linha do tempo / pátio + tabela. Tudo em `pointer-events-none` com filhos `auto`.

| Componente | Função |
|---|---|
| `TopBar` | Logo, nível, busca, seletor de distrito, saúde, "Live", sino, menu do usuário (sons, sair) |
| `DistrictSelector` | Visão geral, cada cliente (`CL-xx`) e cada landmark; no pátio mostra o projeto |
| `SearchPalette` | `/` — clientes, projetos, chamados, faturas, equipe, wiki; sem acento/caixa; setas + Enter |
| `KpiCards` | Contextuais: cidade → saldo/chamados/projetos; cliente → contrato/chamados/a receber; pátio → fila/entregues/bugs |
| `CameraToolbar` | Zoom, girar 90°, casa, modo construção (no pátio: nova atividade) |
| `Inspector` | Card por entidade, com ⌖/seguir, ↗ abrir no Angular, ✕ |
| `TimelineTray` | Ciclo de vida da entidade selecionada (ou do chamado mais urgente) |
| `EntityTable` | Abas Chamados/Projetos/Faturas filtradas pelo contexto |
| `FormDrawer` | Painel lateral de formulários; `key` força formulário limpo |
| `Toasts` | Empilha; tom `xp` com gradiente |

`ui.tsx` reúne os átomos (`Glass`, `StatusChip`, `ProgressBar`, `KeyValue`, `Section`, `ListRow`, `Button`…);
`tones.ts` guarda `cx` e as classes de tom (separado para não quebrar o Fast Refresh).

### Tema

Tokens no `@theme` de `index.css` (`brand`, `ink`, `surface`, `ok/warn/bad/info`, `shadow-card/float`).
Cor da marca `#134ced`. Tema claro "maquete"; `prefers-reduced-motion` reduz animações.

---

## 11. Funcionalidades do sistema

### Leitura

| Recurso | Onde aparece |
|---|---|
| Clientes e contratos | Sedes; inspector de cliente; Prefeitura |
| Projetos | Canteiros; inspector (cronograma, marcos, equipe, quadro) |
| Chamados | Caminhões; inspector; tabela; sino |
| Faturas e despesas | Banco; KPIs; inspector de fatura |
| Wiki | Universidade (leitura; edição abre o Angular) |
| Equipe | Prefeitura; pedestres e empilhadeiras |
| Observabilidade | Data Center (desligada em dev) |
| Dashboard | Saldo do mês, variação, contratos a vencer |

### Escrita

| Ação | Como |
|---|---|
| **Construir sede** (criar cliente) | Tecla `B` → fantasma no próximo lote → formulário |
| Editar / ativar / desativar cliente | Inspector do cliente (preserva `idSistemaOrigem` — o `PUT` sobrescreve) |
| **Abrir canteiro** (projeto) | Inspector do cliente → "Novo" |
| **Abrir chamado** interno | Inspector do cliente → "Abrir" |
| Iniciar / resolver / fechar / reabrir / assumir chamado | Inspector do chamado (otimista) |
| **Converter chamado em atividade** | Inspector do chamado → escolhe projeto/zona → vai ao pátio |
| **Registrar pagamento** | Inspector da fatura (dispara o carro-forte) |
| **Mover caixa** (atividade) | Arrastar entre zonas ou "Mover para a zona" |
| Criar/editar/remover atividade, comentar | Pátio / inspector da atividade |
| Criar/renomear/reordenar/remover zona | Etiqueta da zona no pátio |
| Notificações | Marcar lida / todas; clicar leva ao chamado |

### Fora do escopo do jogo (continua no MrCodeAdmin/Angular)

Editor rico da wiki e upload de imagens, aprovação pública de contrato, edição de despesas/contratos,
gestão de equipe (CRUD de colaboradores). Os inspectors têm o botão ↗ para abrir a tela correspondente.

---

## 12. Gamificação

Tudo em `world/gamification.ts`, **derivado** dos dados — não há tabela no backend. Hooks: `useGame`
(cálculo memoizado), `useGameProgress` (feedback).

### XP

| Fonte | XP |
|---|---|
| Cliente ativo | 100 |
| Contrato ativo/encerrado | 150 |
| Projeto concluído | 250 |
| Chamado resolvido/fechado | Baixa 30 · Média 50 · Alta 100 |
| Atividade entregue | 20 (Bug: 30) |
| Fatura paga | 30 + 5 por R$ 1.000 |
| Artigo da wiki | 15 |

**Premia resultado:** reabrir um chamado remove o XP dele automaticamente.

### Nível e construções

Limiar do nível *n*: `150·n·(n−1)` XP (0, 300, 900, 1800, 3000…).

| Nível | Desbloqueio |
|---|---|
| 2 | Fonte na praça |
| 3 | Estátua do fundador |
| 4 | Parque municipal |
| 5 | Roda-gigante |
| 6 | Torre de vidro |
| 8 | Heliponto |
| 10 | Monumento Mr Code |

### Saúde → clima

`score = 100 − penalidades`, limitado a 0–100.

| Fator | Penalidade |
|---|---|
| Chamado aberto Alta / Média | −12 / −4 cada |
| Fatura atrasada | −10 cada (máx. −30) |
| Projeto atrasado | −8 cada |
| Atividade com prazo vencido | −2 cada (máx. −10) |
| VPS sob pressão (se monitorada) | −10 / −25 |

| Score | Clima |
|---|---|
| ≥ 80 | Sol |
| 60–79 | Nublado |
| 40–59 | Chuva |
| < 40 | Tempestade (relâmpagos + alerta de borda) |

### Missões, ranking e conquistas

- **6 missões semanais** (semana começa na segunda 00:00 local): zerar chamados Alta, resolver 3 chamados,
  entregar 5 atividades, receber 2 faturas, publicar 1 artigo, nenhuma fatura atrasada.
- **Ranking semanal** por responsável: atividades entregues + chamados resolvidos.
- **12 conquistas** avaliadas por condição atual; as já obtidas ficam em `localStorage` e **não se perdem**
  se a condição deixar de valer.

### Feedback (`useGameProgress`)

- A **primeira leitura assentada** da sessão (tudo carregado) vira linha de base; nada de "+XP" falso por
  quadros que chegaram depois.
- Compara com o progresso salvo: "+N XP desde a sua última visita" e celebração "enquanto você estava fora".
- Durante a sessão: toast "+XP · categoria", celebração de nível, conquistas novas, sons (opcionais).

---

## 13. Referência de API

Base `/api` (header `Authorization: Bearer <JWT>`). Resposta padrão `{ data, isSuccess, message, errors }`.

| Módulo | Rotas usadas |
|---|---|
| Login | `POST /Login` → `{ token, usuario }` |
| Cliente | `GET /Cliente`, `POST`, `PUT /{id}`, `PATCH /{id}/status` |
| Contrato | `GET /Contrato` |
| Projeto | `GET /Projeto`, `GET /{id}` (marcos, equipe, links), `POST` |
| Chamado | `GET`, `POST /interno`, `PATCH /{id}/status`, `PATCH /{id}/responsavel`, `POST /{id}/converter-atividade` |
| Fatura | `GET`, `PATCH /{id}/pagar` |
| Despesa | `GET` |
| Wiki | `GET` |
| UsuarioAdmin | `GET` (**ADMIN**) |
| Kanban | `GET /projeto/{id}`; colunas: `POST /projeto/{id}/colunas`, `PUT`/`PATCH mover`/`DELETE /colunas/{id}`; atividades: `POST /colunas/{id}/atividades`, `PUT`/`PATCH mover`/`DELETE /atividades/{id}`; `GET/POST /atividades/{id}/comentarios` |
| Notificacao | `GET /minhas`, `PATCH /{id}/lida`, `PATCH /lida-todas` |
| Dashboard / Observabilidade | `GET /Dashboard/resumo`, `GET /Observabilidade/resumo` |

### Regras do backend que o front respeita

- `Prioridade` ∈ `Baixa | Media | Alta`; `Tipo` de atividade ∈ `Tarefa | Bug | Melhoria | Chamado`.
- Remover coluna só se estiver vazia; `ehColunaConclusao` define `dataConclusao` automaticamente.
- Validação (FluentValidation): razão social ≤ 200, CPF/CNPJ ≤ 20, assunto do chamado 3–150, descrição 10–4000,
  nome do projeto 3–200, previsão ≥ início, título da atividade ≤ 200, nome da zona ≤ 80.
- Datas enviadas como `yyyy-mm-ddT00:00:00`.

---

## 14. Atalhos e navegação

| Tecla | Ação |
|---|---|
| `/` | Abrir busca |
| `Esc` | Fecha, em ordem: busca → painel do jogo → formulário → modo construção → seleção → pátio |
| `B` | Modo construção (no pátio: nova atividade) |
| `G` | Painel do jogo |
| `Q` / `E` | Girar 90° |
| `H` | Visão geral (no pátio: enquadrar zonas) |
| `+` / `−` | Zoom |
| `W A S D` / setas | Pan |

Atalhos são ignorados enquanto se digita em campos ou com busca/formulário abertos.

Mouse: esquerdo arrasta o mapa, direito gira, roda dá zoom, duplo clique num canteiro entra no pátio.

---

## 15. Testes e qualidade

```bash
npm test         # vitest — 38 testes
npm run lint     # oxlint — zero avisos
npx tsc -b       # tipos
```

| Arquivo | Cobre |
|---|---|
| `world/world.test.ts` | Layout estável, vagas de caminhão, posições, status, progresso, ciclo de vida, rotas |
| `world/yard.test.ts` | `moveAtividade` (espelho do backend), estatísticas, layout do pátio, drop |
| `world/gamification.test.ts` | XP, níveis, saúde, semana, missões, ranking, conquistas |

Verificação visual e de interação foi feita com **Playwright + Chrome** (screenshots e arraste real).
Em ambiente sem GPU o render por software roda a ~1 fps — use tempos de espera longos.

---

## 16. Convenções e armadilhas conhecidas

- **Comentários explicam o porquê**; regras de negócio ficam em `world/`, nunca em componentes.
- Componentes só exportam componentes (Fast Refresh); helpers vão para arquivos `.ts` próprios
  (`tones.ts`, `serverErrors.ts`, `crateColors.ts`, `origemColor.ts`).
- Sem `Date.now()`/`Math.random()` durante o render — use `useNow()` ou estado inicial preguiçoso.
- **`<Html>` do drei:** mantenha montado e alterne `visible`; use `labelsPortal`.
- **`PUT /Cliente`** sobrescreve `idSistemaOrigem` — sempre reenviar o valor atual.
- **Mover atividade** exigiu correção no backend (conflito de tracking do EF em
  `KanbanDomainService.ReordenarAtividadesDaColuna`) — sem ela, o `PATCH` retorna 400.
- **Numeração de faturas** (`FaturaDomainService.GerarProximoNumero`) usa o maior sequencial do ano, não a
  contagem — evita duplicidade quando `DataEmissao` diverge do ano do número.
- `camera-controls` trata o `pointerdown` antes do R3F → desabilite o controle durante arrastes.
- Tokens JWT expiram; em testes automatizados renove o token.
- `exitYard(false)` sai do pátio sem selecionar o canteiro (usado ao ir para a visão geral).

---

## 17. Limitações e roadmap

| Limitação | Motivo / caminho |
|---|---|
| Linha do tempo sem horário por etapa (só a atual) | Backend sem histórico de status → tabela `historico_status` |
| Conquistas só no navegador | Persistir no backend (`gamificacao_*`) e ranking compartilhado |
| "Live" por polling (30 s) | SignalR com eventos de domínio |
| Observabilidade vazia em dev | Flag de mock no backend |
| Bundle ~1,5 MB | Code-splitting da cena 3D e da HUD (Fase 6) |
| Sem layout para celular | Bottom sheets e inspector deslizante (Fase 6) |
| Arrasto não testado em toque | Validar em dispositivo real |
| Sem testes E2E no repositório | Playwright no CI (Fase 6) |
| Sem tour de primeiro acesso | Fase 6 |

Fase 6 (polimento) está descrita em [PLANO-EVOLUCAO.md](PLANO-EVOLUCAO.md).

---

## 18. Referências externas

- React Three Fiber — https://r3f.docs.pmnd.rs
- drei — https://drei.docs.pmnd.rs
- three.js — https://threejs.org/docs
- camera-controls — https://github.com/yomotsu/camera-controls
- postprocessing / N8AO — https://github.com/pmndrs/react-postprocessing
- maath (easing) — https://github.com/pmndrs/maath
- TanStack Query — https://tanstack.com/query/latest
- Zustand — https://zustand.docs.pmnd.rs
- React Hook Form — https://react-hook-form.com · Zod — https://zod.dev
- Tailwind CSS 4 — https://tailwindcss.com/docs
- Vite — https://vite.dev · Vitest — https://vitest.dev · Oxlint — https://oxc.rs
- Repositório do backend/painel: `mr-code-admin` (ACESSOS-DEV.txt, DEPLOY.md)
