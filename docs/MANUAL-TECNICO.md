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
19. [Deploy](#19-deploy)
20. [Acessibilidade, celular e desempenho](#20-acessibilidade-celular-e-desempenho)

---

## 1. Visão geral

| Aspecto | Descrição |
|---|---|
| Tipo | SPA React (Vite) com cena 3D em WebGL (React Three Fiber) |
| Backend | **Nenhum próprio.** Consome a API do **MrCodeAdmin** (.NET 8) — mesma conta e mesmos dados do painel Angular |
| Persistência local | Preferências, conquistas e **metas de XP** no `localStorage` (por usuário, por navegador — ver §7 e §17) |
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
| Contratos e equipe | **Escritório** |
| Metas de XP da equipe | **Prefeitura** |

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
| Qualidade | vitest 5, Playwright 1.63, oxlint | Testes unitários, E2E e lint |
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
| `npm run e2e` | Playwright (exige backend + `E2E_EMAIL`/`E2E_PASSWORD`) |
| `npm run models` | Reotimiza os GLB dos kits Kenney para `public/models` (§9.6) |

### Como o front fala com a API

`src/config/environment.ts` usa sempre `apiUrl = '/api'`. Em desenvolvimento o **proxy do Vite**
([vite.config.ts](../vite.config.ts)) repassa `/api` para `http://localhost:5200`, o que dispensa CORS
(o CORS de dev do backend só libera `localhost:4400`, a porta do Angular). Para apontar para outro backend:

```bash
VITE_API_PROXY_TARGET=http://outro-host:5200 npm run dev
```

Em produção o app deve ser servido sob o mesmo domínio da API (`/api`).

### Flags da URL e alças de desenvolvimento

A URL é o estado de navegação (§7), e algumas chaves a mais existem para desenvolver e testar:

| Flag | O que faz | Onde vale |
|---|---|---|
| `?sel=cliente:3` | Abre com a entidade selecionada (`cliente`, `projeto`, `chamado`, `fatura`, `colaborador`, `atividade` ou um landmark) | sempre |
| `?yard=3` | Abre direto no pátio de obras do projeto 3 | sempre |
| `?interior=banco` · `?interior=universidade` | Abre direto no cenário interno | sempre |
| `?perf` | Medidor de fps, draw calls e triângulos (§20) | sempre |
| `?mock=wiki` | Força o acervo de exemplo da biblioteca mesmo havendo wiki de verdade (§10.4) | **só em dev** |

E, **só sob `import.meta.env.DEV`**, quatro alças em `window` para os roteiros de navegador dirigirem
o jogo sem depender de clique:

| Alça | Expõe | Por quê |
|---|---|---|
| `window.__ui` | `uiStore` | Selecionar, entrar em cenário, abrir drawer |
| `window.__game` | `gameStore` | Abrir o painel do jogo numa aba específica |
| `window.__metas` | `metasStore` | Semear e conferir metas |
| `window.__r3f` | Estado do R3F (`scene`, `camera`, `gl`) | **A cena 3D não é alcançável de fora**: a câmera do R3F não fica dentro da cena e o canvas não publica a raiz. Sem isso não há como um teste mirar um objeto 3D (§15) |

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
   A única exceção é o bônus das metas cumpridas: recompensa que não se registra ou se paga duas
   vezes, ou some (§12).
7. **A cena confirma a ação.** Clicar não muda só um painel: o malote entra no cofre quando uma
   fatura é paga, e o leitor da biblioteca levanta e busca o livro do artigo aberto. Quando a
   animação pode não existir (movimento reduzido), há sempre um toast dizendo o mesmo.

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
├── App.tsx                  # Login ⇄ Game (carregado sob demanda)
├── Game.tsx                 # Layout da HUD; cidade 3D ⇄ lista; desktop ⇄ celular
├── index.css                # Tokens Tailwind (@theme), animações globais
├── config/environment.ts    # apiUrl, adminUrl
│
├── api/
│   ├── endpoints.ts         # Chamadas cruas por módulo (objeto `api`)
│   ├── queries.ts           # Hooks de leitura (useQuery) + useAllKanbans
│   ├── mutations.ts         # Mutações de clientes, projetos, chamados, faturas, notificações
│   ├── kanban.ts            # Queries/mutações do Kanban (mover otimista, zonas, comentários, converter)
│   ├── queryClient.ts       # QueryClient, intervalo do "Live", chaves (`qk`)
│   └── mockWiki.ts          # Acervo de exemplo da biblioteca (dev, com a wiki vazia)
│
├── lib/
│   ├── http.ts              # fetch com JWT, ApiError, normalização de erros
│   ├── format.ts            # moeda, datas, stripHtml, textToHtml, resumo
│   ├── wikiContent.tsx      # HTML do artigo da wiki → elementos React (lista de tags permitida)
│   ├── useCountUp.ts        # Animação numérica dos KPIs
│   └── sfx.ts               # Efeitos sonoros sintetizados (WebAudio)
│
├── types/
│   ├── api.ts               # ApiResponse, FieldError, login
│   └── domain.ts            # DTOs de leitura e de escrita
│
├── store/
│   ├── authStore.ts         # Token e usuário (localStorage)
│   ├── uiStore.ts           # Seleção, câmera, drawer, pátio, interior, follow — espelhado na URL
│   ├── gameStore.ts         # Painel do jogo, celebração, som, progresso salvo
│   ├── toastStore.ts        # Notificações efêmeras
│   ├── cityEvents.ts        # Animações passageiras (caminhão saindo, carro-forte)
│   ├── prefsStore.ts        # Modo 3D/lista, reduzir animações, placas, detecção de WebGL
│   ├── phoneStore.ts        # Celular: aberto/recolhido, aba, tela e filtros da listagem
│   ├── bankStore.ts         # Agência: mês, aba, tela do detalhe, seleção e filtros do extrato
│   ├── metasStore.ts        # Metas da Prefeitura e o registro do que já foi batido (localStorage)
│   ├── wikiStore.ts         # Biblioteca: artigo aberto e busca (compartilhados com a estante 3D)
│   └── tourStore.ts         # Tour guiado (passo atual, "já visto" por usuário)
│
├── hooks/
│   ├── useWorld.ts          # Todos os dados da cidade + useCityLayout
│   ├── useDistricts.ts      # Seletor de distrito; contextClienteId
│   ├── useYard.ts           # Pátio aberto (projeto + quadro + layout)
│   ├── useGame.ts           # XP, nível, saúde, missões, ranking, conquistas
│   ├── useGameProgress.ts   # Observa o jogo e gera toasts/celebrações
│   ├── useMetas.ts          # Carrega as metas do usuário; contagem das que estão em andamento
│   ├── useKeyboardShortcuts.ts
│   ├── useNow.ts            # "Agora" como estado (evita Date.now() no render)
│   ├── useReducedMotion.ts  # Sistema OU preferência do usuário
│   └── useIsMobile.ts       # useMediaQuery + useIsMobile (< 768px) e useIsDesktop (≥ 1024px)
│
├── world/                   # Regras puras (testadas)
│   ├── layout.ts            # Grade de lotes, canteiros, caminhões, ruas, fileira cívica
│   ├── decor.ts             # Onde cada construção de desbloqueio fica plantada
│   ├── datas.ts             # Datas de dia inteiro (aaaa-mm-dd) em horário local
│   ├── metas.ts             # Metas: janela, progresso por métrica, situação, validação
│   ├── routes.ts            # Caminhos poligonais (carro-forte, pedestres)
│   ├── yard.ts              # Pátio do Kanban: zonas, vagas, drop
│   ├── kanban.ts            # moveAtividade (espelho do backend), estatísticas
│   ├── status.ts            # Tons, rótulos, códigos, progresso de projeto
│   ├── lifecycle.ts         # Etapas de chamado/contrato/fatura/projeto
│   ├── positions.ts         # Onde a câmera olha para cada entidade
│   ├── gamification.ts      # XP, níveis, saúde, missões, ranking, conquistas
│   ├── health.ts            # Saldo e saúde do banco / data center
│   ├── signs.ts             # Placas: âncoras, recorte do rótulo, curva de opacidade
│   ├── outskirts.ts · seeded.ts  # Bosque do campo e o pseudoaleatório determinístico
│   ├── phone.ts             # Celular: abas, filtros, conversas, blocos do chat, prazo
│   ├── extrato.ts           # Agência: mês, recorte, filtros, agrupamento por dia, totais, grade do ano
│   ├── interior.ts          # Casca comum dos cenários internos: sala, paredes, rodapé, câmera
│   ├── interiors.ts         # Registro dos interiores (tipo, câmera e limites de cada um)
│   ├── bank.ts              # Planta baixa da agência, caminhos do malote, âncora do calendário, câmera
│   ├── universidade.ts      # Biblioteca: estante, artigos, lombadas, mesa e trajeto do leitor, câmera
│   ├── text.ts              # `norm` (busca sem acento/caixa)
│   └── colors.ts            # Paleta 3D
│
├── scene/                   # Componentes R3F
│   ├── CityScene.tsx        # Canvas, luz/céu, alterna cidade ⇄ pátio ⇄ interiores, AO
│   ├── CameraRig.tsx        # Controles, limites, foco, seguir, enquadrar pátio
│   ├── Ground.tsx           # Chão, ruas, lotes, árvores instanciadas
│   ├── ClientBuilding.tsx · ConstructionSite.tsx · Landmark.tsx
│   ├── Citizens.tsx · Walkers.tsx
│   ├── CityDecor.tsx        # Construções desbloqueadas por nível
│   ├── Outskirts.tsx        # Bosque instanciado no campo em volta da cidade
│   ├── Weather.tsx · weatherStyle.ts
│   ├── SceneTag.tsx · MapPin.tsx · SelectionMarker.tsx · BuildGhost.tsx
│   ├── assets.ts · kenney.ts   # URLs dos GLB por kit e carga/normalização dos modelos
│   ├── BuildingSign.tsx · signTexture.ts · signView.ts  # Placas com o nome de cada construção
│   ├── labelsPortal.ts · movers.ts · useHover.ts · motion.ts
│   ├── perf.ts · PerfProbe.tsx  # Medidor ?perf (renderer.info)
│   ├── people/              # CharacterModel: boneco animado da Kenney (sit, walk, pick-up, emote-yes)
│   ├── vehicles/            # TruckModel, ChamadoTruck, EventVehicles, detector de eventos
│   ├── yard/                # KanbanYard, Crate (arrastável), Forklift, crateColors
│   ├── CoinBurst.tsx        # Estouro de moedas (carro-forte na cidade, cofre na agência)
│   ├── interior/            # Casca compartilhada dos interiores: lajes, mobília do kit, sala
│   ├── bank/                # Interior da agência: sala, calendário de parede e animações
│   └── universidade/        # Interior da biblioteca: estante, lombadas clicáveis, etiquetas, leitor
│
├── hud/                     # Componentes DOM
│   ├── TopBar · DistrictSelector · NotificationBell · SearchPalette
│   ├── KpiCards · CameraToolbar · TimelineTray
│   ├── FormDrawer · Toasts · chamadoActions.ts
│   ├── phone/               # Celular do atendimento: aparelho, app, telas de chamados e chat
│   ├── bank/                # Agência: extrato, detalhe do lançamento, navegador de mês, barra inferior
│   ├── wiki/                # Biblioteca: índice das prateleiras, artigo e barra inferior
│   ├── inspector/           # Inspector + um por tipo de entidade (incl. Atividade)
│   ├── forms/               # Cliente, Projeto, Chamado, Atividade, Coluna, ConverterChamado, Fatura, Despesa, Meta
│   ├── yard/                # YardPanel, YardTable
│   ├── game/                # GameChips, GamePanel, LevelUpOverlay, weatherMeta
│   ├── list/ListView.tsx    # Alternativa 2D (cidade e quadro)
│   ├── MobileDock.tsx · Tour.tsx · PerfOverlay.tsx
│   ├── ui.tsx · tones.ts · camera.ts · useClickOutside.ts
│
└── components/LoginScreen.tsx
e2e/                         # Playwright (somente leitura)
deploy/nginx-city.location.conf
.github/workflows/ci.yml     # lint · tipos · unit · build
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

- Polling global de **30 s** (`LIVE_INTERVAL_MS`) + refetch ao focar a janela. O estado aparece no wifi
  da barra de status do celular (§10.1); falhando, a barra superior mostra o chip "Reconectando".
- `useWorld()` combina 9 queries **independentes** (uma falha não derruba as demais) e devolve um objeto
  **memoizado** — pode ser dependência de `useMemo`. `isLoading`/`isError` consideram só clientes,
  contratos, projetos e chamados.
- `useEquipeQuery` só roda para `ADMIN` (o endpoint exige o papel).
- `useAllKanbans(projetos)` assina o quadro de todos os projetos não cancelados (cache compartilhado com o
  pátio) para pedestres e gamificação. `combine` com referência estável evita re-render em loop.
- Chaves em `qk` (`queryClient.ts`). Ao sair, `App` chama `queryClient.clear()`.

**Nem todo detalhe merece uma query.** O `GET /Wiki` devolve o DTO inteiro, `conteudo` incluído
(conferido no `WikiPaginaService.ObterTodos` do backend) — então a biblioteca lê o artigo da própria
lista e **não existe** `useWikiDetalheQuery`. Buscar por id seria um request a mais pelos mesmos bytes
que já chegaram, e ainda criaria um estado de 404 para tratar com o painel aberto. O chamado é o caso
oposto: `GET /Chamado/{id}` traz campos que a lista não traz, e aí a query de detalhe se paga.

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
| `useEnviarMensagem` | `POST /Chamado/{id}/mensagens` | não |
| `useEstornarFatura`, `useCancelarFatura`, `useCriarFatura`, `useAtualizarFatura` | `PATCH/POST/PUT /Fatura…` | não |
| `useCriarDespesa`, `useAtualizarDespesa`, `usePagarDespesa`, `useEstornarDespesa` | `POST/PUT/PATCH /Despesa…` | não |
| `useGerarFaturasRecorrentes`, `useGerarDespesasRecorrentes` | `POST /{Fatura\|Despesa}/gerar-recorrentes` | não |
| `useConverterChamado` | `POST /Chamado/{id}/converter-atividade` **+ 2** (ver abaixo) | não |
| `useMarcarNotificacaoLida`, `useMarcarTodasLidas` | `PATCH /Notificacao/...` | não |

As **metas da Prefeitura** não aparecem nesta tabela porque não têm endpoint: são escritas no
`localStorage` pelo `metasStore` (§12 e §17).

Padrão de `useGameMutation`: toast de sucesso; em erro **de campo** não mostra toast (o formulário exibe
no campo); `onSettled` invalida os recursos afetados e o `dashboard`.

**`useConverterChamado` são três chamadas**, porque `POST /Chamado/{id}/converter-atividade` não aceita
prazo:

1. converte — a caixa passa a existir no pátio;
2. `PUT /Kanban/atividades/{id}` grava o `dataPrazo`. O `PUT` substitui o registro inteiro, então
   título, descrição, tipo, prioridade e responsável voltam a partir da atividade do passo 1;
3. `POST /Chamado/{id}/mensagens` avisa o cliente (`mensagemDePrazo`).

Depois do passo 1 nada pode virar um "falhou" genérico — o usuário repetiria e duplicaria a caixa.
Os passos 2 e 3 são capturados e o toast diz exatamente o que não foi salvo.

As mutações do financeiro invalidam `faturas`, `despesas` **e** `['financeiro']` (todos os meses do
resumo): estornar um pagamento muda o mês em que o valor conta, não só o mês aberto.

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
| `interior` | Cenário interno aberto (`'banco'` \| `'universidade'`); `null` = cidade. Excludente com o `yard` |
| `dragging` | Uma caixa segura o ponteiro (câmera travada) |
| `searchOpen` | Paleta de busca |

Preferências persistentes ficam em `prefsStore`: `viewMode` (`3d`/`lista`, chave `mrcode-city:view`) e
`reduceMotion` (`mrcode-city:reduce-motion`). Sem WebGL, `viewMode` é forçado para `lista`.

**Sincronização com a URL** (`history.replaceState`): `?sel=cliente:3`, `?yard=3` e
`?interior=universidade`. Permite link direto e recarregar sem perder o foco. `select()` estando no
pátio ou num interior sai dele (exceto `atividade`, que só existe dentro do pátio).

**Por que `interior` é um campo e não uma flag por cenário.** Os cenários internos se excluem entre si
e com o `yard`. Com `banco: boolean` + `universidade: boolean`, cada `enter*` teria de zerar as outras
flags, e a invariante "no máximo um aberto" viraria uma combinação de `if`s espalhada por
`CameraRig`, `camera.ts`, `Game.tsx` e `useDistricts`. Com um campo só, somar um cenário é somar uma
linha em `world/interiors.ts` (`INTERIOR_CAMERA`, `INTERIOR_BOUNDS`) e um ramo no `CityScene`.

### Outros stores

- `authStore` — `mrcode_token` / `mrcode_usuario` no `localStorage`.
- `gameStore` — painel, aba, celebração, som (`mrcode-city:sound`), progresso por usuário
  (`mrcode-city:game:<id>` → `{achievements, level, xp}`). Todo acesso a storage é protegido por `try/catch`.
- `toastStore` — tons `ok | bad | info | xp`; some em 4 s (6 s para erro); máximo de 4 empilhados.
- `cityEvents` — fila de animações (`truck-leave`, `armored`, `malote`, `extrato-ping`, `wiki-memo`)
  e a flag `ready`. Uma fila para os quatro cenários: cada um renderiza os tipos que conhece.
- `bankStore` — agência: mês (compartilhado com o calendário 3D da parede), aba, tela do painel da
  esquerda, lançamento selecionado e filtros. `limpar()` roda ao sair do cenário, para a próxima
  visita recomeçar no mês corrente.
- `wikiStore` — biblioteca: artigo aberto e busca. Mora fora do painel porque duas superfícies
  disputam os mesmos valores — a **estante 3D** (quais lombadas aparecem, qual está puxada) e o painel
  da direita. `voltar()` fecha o artigo e devolve `false` quando já estava na estante, que é o que o
  `Esc` usa para decidir se sai do cenário.
- `metasStore` — metas da Prefeitura e o registro do que já foi batido, em
  `mrcode-city:metas:<idUsuario>`. **Chave separada da do `gameStore`** de propósito: aquela é
  reescrita a cada tique assentado do jogo, com estado derivado; meta é conteúdo que o usuário
  escreveu e não pode ir embora junto com um cálculo. Toda escrita passa por um `persistir` que
  devolve `semArmazenamento` quando o navegador recusa — a Prefeitura mostra o aviso em vez de fingir
  que salvou.
- `phoneStore` — celular: `aberto` (persistido em `mrcode-city:phone`, padrão ligado), aba, tela e
  filtros. `setAberto` é a escolha do usuário e persiste; `recolher` é o recolhimento automático e
  **não** vira preferência. `montado` diz se o aparelho está mesmo na tela — é o que autoriza o `Esc`
  global a mexer nele.

**Chaves no `localStorage`** (tudo sob `try/catch`; o jogo funciona sem nenhuma delas):

| Chave | Conteúdo |
|---|---|
| `mrcode_token` · `mrcode_usuario` | Sessão |
| `mrcode-city:view` | `3d` ou `lista` |
| `mrcode-city:reduce-motion` · `mrcode-city:sound` · `mrcode-city:signs` | Preferências |
| `mrcode-city:phone` | Celular aberto ou recolhido |
| `mrcode-city:tour:<id>` | Tour já visto, por usuário |
| `mrcode-city:game:<id>` | `{ achievements, level, xp }` — reescrito a cada tique assentado |
| `mrcode-city:metas:<id>` | `{ metas, cumpridas }` — **conteúdo do usuário**, por isso separado |

> As alças de desenvolvimento em `window` estão em §3.

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
- **Fileira cívica** (`LANDMARKS`): cinco prédios em z = `LANDMARK_Z`, com passo 4 e deslocada meio
  passo (−10, −6, −2, 2, 6). Nenhuma das duas escolhas é estética: com passo 5 o quinto prédio caía
  fora da visão geral, e centrada em 0 um prédio cairia em cima da fonte da praça. `MIN_HALF_WIDTH`
  abre o limite do pan para alcançar as pontas.

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

### 8.6 Interiores (`interior.ts`, `interiors.ts`)

A agência do BC e a biblioteca da UN têm a mesma casca: uma sala pequena de ladrilhos 1×1, **duas**
paredes lisas (fundo e esquerda — as da frente tapariam a cena), rodapé e móveis do kit da Kenney em
escala natural. `interior.ts` guarda isso parametrizado por `Sala { cols, rows }`: `tileCenter`,
`colX`/`rowZ`, `wallSlabs`, `baseboardSlabs`, `floorTiles`, `roomBounds` e `interiorCamera`
(direção × distância). `interiors.ts` é o registro — o tipo `InteriorKind` nasce ali (e não no
`uiStore`, para `world/` seguir sem depender do estado) junto de `INTERIOR_CAMERA` e `INTERIOR_BOUNDS`.

### 8.7 Agência (`extrato.ts`, `bank.ts`)

- `extrato.ts` é o que o portal faz em `computed()`, só que puro: `deslocarMes` (atravessa a virada de
  ano), `labelMes`, `mesParam` (`aaaa-MM`, o que a API espera), `noMes` (fatura pelo **vencimento**,
  despesa pela **data do lançamento**), `filtrarFaturas`/`filtrarDespesas` (busca via `norm`),
  `agruparPorDia` com rótulo **Hoje/Ontem** a partir de um `agora` injetado, e `resumoDespesas` — o
  `GET /Financeiro/resumo` só cobre faturas.
- `bank.ts` é a **planta baixa** da agência: a sala, as paredes do fundo e da esquerda (as da frente
  tapariam a cena), o balcão, o posto do caixa, o cofre, a espera e o `BANK_CAMERA`. Toda posição ali
  é o **centro** da peça, apoiada no chão — ver a armadilha da origem em §16. Também guarda os pontos
  notáveis das animações (`PORTA`, `BALCAO`, `COFRE`, `CAIXA_TELA`), os caminhos do malote
  (`MALOTE_ENTRA`/`MALOTE_SAI`, que são `Path` de `routes.ts` e usam o mesmo `pointAt` do
  carro-forte) e a âncora do calendário de parede.
- `mesesDoAno(ano)` em `extrato.ts` é a grade 4×3 do calendário — rótulo curto, sem o ponto que o
  `Intl` põe em pt-BR.

### 8.8 Biblioteca (`universidade.ts`)

A estante **é** a navegação: um nível por projeto, um livro por artigo.

- `prateleiras(paginas, projetos)` agrupa — a "Geral" (artigos sem projeto) no topo, depois um nível
  por projeto **que tem artigo**, na ordem do id. Projeto sem artigo não ganha prateleira. Passando de
  `MAX_PRATELEIRAS`, o excedente cai num nível "Outros": a estante tem tamanho fixo, mas nenhum artigo
  some da contagem (`total` = `paginas.length + ocultos`).
- Quando não cabe tudo numa prancha, ficam os **atualizados mais recentemente**; a prancha exibe em
  ordem de título. O limite é físico (a soma das larguras) além do teto de contagem.
- `livros(prateleiras)` enfileira as lombadas **centradas** na prancha. Encostar à esquerda seria o
  natural numa estante de verdade, mas com poucos artigos a fila vira um amontoado num canto.
- `larguraDoLivro` cresce com o título (com piso e teto): lombada fina demais some na distância da
  câmera, e alvo de clique precisa ter tamanho de alvo de clique. `corDoProjeto` indexa a paleta pelo
  **id** do projeto, não pela posição na lista — senão a estante trocaria de cor a cada refetch do
  "Live". `tonalizar` varia o tom dentro da mesma prateleira.
- A estante funcional **não** vem do kit: os `bookcase*` têm as prateleiras internas numa altura fixa
  do modelo, e aqui a divisão depende do dado. Ela é montada com caixas (`estanteSlabs`), como as
  paredes; o kit mobilia o resto da sala.

### 8.9 Metas (`metas.ts`) e datas (`datas.ts`)

- `metas.ts` é a regra das metas da Prefeitura: janela inclusiva em horário local, progresso por
  métrica, situação, registro e validação — ver §12 "Metas da equipe", onde o assunto está inteiro.
- `datas.ts` existe porque **data de dia inteiro é um tipo diferente de instante**. `aaaa-mm-dd` é o
  que um `<input type="date">` devolve, e `new Date('2026-11-01')` lê como UTC: em fuso negativo, o
  dia vira o anterior. `formatarDia`, `hojeISO` e `diaISOEm` montam tudo a partir dos pedaços. O
  `formatarPrazo` do celular passou a ser um apelido de `formatarDia` — era a mesma função duplicada.

### 8.10 Decoração (`decor.ts`)

`DECOR_SPOTS` guarda **onde** cada construção de desbloqueio fica plantada (o desenho continua em
`scene/CityDecor.tsx`). Está em `world/` porque essas posições disputam espaço com a fileira cívica e
precisam entrar nos testes junto dos landmarks: enquanto a coordenada vivia só no componente,
`signs.test.ts` repetia uma cópia dela, e o quinto prédio cívico acabou plantado em cima do monumento
sem nada acusar. Hoje o teste cruza `LANDMARKS` × `DECOR_SPOTS` e falha.

### 8.11 Celular (`phone.ts`)

- `ABA_STATUS` mapeia as três abas nos quatro status (`Resolvido` + `Fechado` = "fechados");
  `filtrarChamados` e `contarPorAba` aplicam busca (via `norm`), prioridade, origem e o cliente do
  contexto — a contagem usa os **mesmos** filtros da lista, senão o número contradiz o que se vê.
- `conversas(clientes, chamados)` monta o índice do chat: uma conversa por cliente, ordenada pela
  atividade mais recente, com os clientes sem chamado no fim.
- `blocosDaConversa(mensagens, chamados)` mescla as threads em ordem cronológica e abre um bloco novo
  a cada troca de `idChamado` — é o separador de protocolo da conversa.
- `prazoInvalido` e `mensagemDePrazo` governam a conversão: o prazo é obrigatório, não pode ser no
  passado, e `formatarPrazo` monta `dd/mm/aaaa` sem passar por `Date` (que leria `yyyy-mm-dd` como UTC
  e viraria o dia).

---

## 9. Cena 3D

### 9.1 Canvas e iluminação (`CityScene.tsx`)

- `shadows="percentage"`, `flat` (sem tone mapping — mantém as cores da marca), `dpr` adaptativo
  (`PerformanceMonitor` + `AdaptiveDpr`).
- Luz **física** (three r155+): hemisfério + direcional; intensidades vêm de `weatherStyle.ts`.
- `Scene` = luz/céu/câmera comuns; o conteúdo alterna entre **quatro cenários** — `<City />`,
  `<KanbanYard />`, `<BankBranch />` e `<Library />` — pelo par `yard` / `interior` do `uiStore` (§7).
  O clima só existe na cidade: dentro de um interior não chove.
- **`onPointerMissed` continua ativo nos cenários internos.** Lá não há entidade selecionada, mas o
  handler dispara a cada clique no vazio: na biblioteca ele **fecha o artigo** em vez de chamar
  `clearSelection` (§16).
- **N8AO** (oclusão ambiente) começa desligado e só liga quando o `PerformanceMonitor` confirma folga.
- Um contêiner DOM estável (`labelsPortal`) hospeda todos os `<Html>` do drei — sem ele o R3F troca o alvo
  das etiquetas e o React 19 reclama de desmontagem durante o render.

### 9.2 Câmera (`CameraRig.tsx`)

- Botão esquerdo = pan, direito = girar (preso entre `minPolarAngle 0.55` e `maxPolarAngle 1.05`),
  roda = zoom com `dollyToCursor`.
- Limites do pan = `bounds` da cidade (cresce com os lotes), do pátio ou do interior
  (`INTERIOR_BOUNDS`, em `world/interiors.ts`).
- **Enquadramento de cada cenário vem de uma tabela**, não de uma cadeia de `if`: `INTERIOR_CAMERA`
  dá a câmera de entrada e a "casa" (tecla `H`) de cada interior. Somar um cenário é somar uma linha.
- **Voar até a seleção** depende de `focusNonce` e da posição do alvo; o refetch periódico não "puxa"
  a câmera (a chave de posição não muda).
- **Seguir:** a cada frame `moveTo` o objeto registrado em `movers`; qualquer gesto manual
  (`controlstart`) desliga.
- Dentro do pátio: enquadra todas as zonas (`YARD_CAMERA`) e usa distância de foco maior.

### 9.3 Cidade

| Componente | Observações |
|---|---|
| `Ground` | Campo, tapete claro da cidade, praça, malha viária em ladrilhos (`Instances` por peça), lotes, árvores |
| `Outskirts` | Bosque instanciado no campo em volta da cidade (§9.8) |
| `ClientBuilding` | "Sobe do chão" ao aparecer; pin de atenção; etiqueta `CL-xx` |
| `ConstructionSite` | Estacas (planejamento), andaime ∝ progresso + guindaste, faixa (pausado), anexo (concluído); duplo clique entra no pátio |
| `Landmark` | Data Center (tanque industrial), Banco, Universidade, Prefeitura, Escritório; cor/pulso pela saúde |
| `BuildingSign` | Placa com o nome da construção (§9.7); some ao afastar a câmera e pela chave do menu |
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

### 9.6 Modelos 3D (kits Kenney, CC0)

Os kits originais ficam em `assets-src/kenney/<kit>/` — **fora do git** (`.gitignore`) por causa do peso
(FBX/OBJ/previews). O que entra no build é só o GLB usado, gerado por:

```bash
npm run models        # scripts/sync-models.mjs
```

O script otimiza com `gltf-transform` (meshopt, textura embutida) para `public/models/<grupo>/` e copia a
licença. Grupos: `city` (comercial), `industrial`, `roads`, `nature`, `cars`, `characters`,
`furniture` — pastas
separadas porque os nomes colidem entre kits (`building-a` existe no comercial e no industrial). Kit
ausente em `assets-src` é pulado, mantendo o que já está em `public/models`.

Um kit pode entregar outro formato/layout: `sub` troca a subpasta e `ext` a extensão (o "3D Road Tiles"
é `Models/gLTF/*.gltf`), e uma entrada `{ from, to }` renomeia no destino — `roadTile_019` não diz nada,
`pine` diz.

**A lista de modelos do script deve espelhar `src/scene/assets.ts`.** Lá ficam as URLs por kit
(`cityModel`, `industrialModel`, `roadModel`, `carModel`, `characterModel`), o `brightnessFor` (clareia a
cor base por kit — a paleta da Kenney é mais escura que a maquete) e o `PRELOAD`.

`useKenneyModel` (em `kenney.ts`) centraliza a cópia normalizada: centrada em x/z, apoiada em y = 0 e
escalada ao tamanho pedido. `useKenneyParts` é a variante para instanciar — devolve geometria + material
por primitiva do GLB, prontos para `InstancedMesh`, com normalização e troca de cor opcionais.

**Nem todo modelo deve ser normalizado.** Os móveis dos interiores entram em **escala natural**
(`useKenneyParts` sem `size`): o kit já é desenhado numa grade de 1×1, e normalizar peça a peça
deixaria a lixeira do tamanho do sofá. Em compensação, a **origem deles fica num canto**, não no
centro — quem recentra é o `FurnitureLayers` (§9.9 e §16).

**Personagens têm esqueleto.** O kit "Mini Characters" traz ~30 clipes por boneco (`idle`, `walk`,
`sit`, `pick-up`, `emote-yes`, `interact-right`…); `CharacterModel` (em `scene/people/`) clona o
esqueleto por instância com `SkeletonUtils` e toca o clipe com transição curta. O tipo
`CharacterAnimation` lista só os que o jogo usa — a lista inteira está no GLB.

**Ruas:** `Ground` monta a malha com os ladrilhos 1×1 do kit de estradas. O quarteirão (`LOT_SPACING`) é
dividido em `TILES_PER_BLOCK = 6` ladrilhos, então a largura da pista sai do passo e as retas encostam
exatamente nos cruzamentos. `junctionFor` escolhe peça e giro pelas saídas do cruzamento (cruz no miolo,
T nas bordas, curva nos cantos); na orientação original a reta corre no eixo x, a curva liga -x a +z e o
T tem a perna em +z.

### 9.7 Placas com nomes (`BuildingSign`)

Cada landmark e cada sede de cliente ganha um **totem**: painel sobre um poste, em frente ao prédio, com
o código e o nome (`clienteNome` / `LANDMARK_META` — nada de derivar rótulo em outro lugar).

- **Texto em `CanvasTexture`, não no `<Text>` do drei.** O troika recusa `.woff2` e `@fontsource-variable/inter`
  só entrega `.woff2`; sem arquivo local ele ainda cai num CDN (jsDelivr) para a fonte padrão e para o
  resolvedor Unicode. O canvas reaproveita a Inter que a HUD já carregou, custa 1 draw call por placa e
  pinta o mesmo cartão da pílula de hover. `signTexture.ts` rasteriza; `useSignFontsReady()` espera a
  fonte (o Canvas2D não dispara `@font-face` preguiçoso sozinho).
- **Billboard só no eixo y.** O azimute da câmera é livre, então placa presa à fachada ficaria de costas
  metade do tempo. Continua girando com movimento reduzido ligado — é legibilidade, não enfeite.
- **Material básico.** Com material iluminado o texto escureceria na tempestade e o brilho pulsaria
  enquanto o usuário gira a cidade (o painel muda de ângulo com a luz direcional).
- **Geometria e fade em `world/signs.ts`** (puro, testado). O totem é alto de propósito: o lote de 3,8
  não tem canto livre para o painel quando o cliente tem 4+ projetos, então o poste passa *entre* os
  canteiros e o painel passa *por cima* deles (`LOT_OBSTACLE_TOP`).
- **O fade usa `controls.distance`**, publicada por `SignViewUpdater` em `signView.ts`. Medir por placa
  faria a cidade desbotar em gradiente e as placas sumirem uma a uma ao girar.
- A placa herda `onClick` e o hover do prédio: sem isso o clique nela cairia no `onPointerMissed` do
  `Canvas` e **limparia a seleção**.
- Chave "Placas com nomes" no menu do usuário (`mrcode-city:signs`). Com a placa ligada, a pílula de
  hover mostra só o estado ao vivo (`N chamados`) — o nome já está no totem.

### 9.8 Campo em volta da cidade (`Outskirts`)

O chão (160×160) é verde (`COLORS.field`); a cidade fica num **tapete claro** (`cityPlatform`) desenhado
logo abaixo das ruas, em y = 0,004. Fora dele, `Outskirts` espalha pinheiros e arbustos.

- **Espalhamento puro e determinístico** em `world/outskirts.ts` (`seeded`, de `world/seeded.ts`): o
  bosque nasce igual a cada render e entre sessões, sem guardar nada. `insideCity` barra o miolo urbano
  e `MIN_SPACING` impede que duas copas se embolem.
- O alcance para em `FIELD_REACH = 38` — a névoa começa em 38 e a câmera não se afasta além de 48, então
  povoar mais longe só custaria.
- **Tudo instanciado** (`useKenneyParts` + drei `<Instances>`): o pinheiro da Kenney vem com copa e
  tronco em primitivas separadas, então cada peça vira sua própria `<Instances>` — 4 draw calls para o
  campo inteiro.
- **Cores do tema, não do kit.** Os modelos vêm do "3D Road Tiles", que é de outra safra: sem textura e
  com verde oliva saturado. Como a cor mora só no material, `useKenneyParts({ colors })` troca `Grass`
  por `COLORS.tree` e `Alternate_Dirt` por `COLORS.trunk`. Passe uma referência **estável** em `colors`:
  ela entra nas dependências do memo.
- Daquele kit só saem `pine` e `bush` (renomeados de `roadTile_019`/`020` no `sync-models.mjs`). Os
  blocos de relevo foram testados e descartados: isolados num plano liso viram lajes verdes angulares,
  não morros.

### 9.9 Interiores de landmark (`scene/interior/`)

Dois cenários hoje — a agência do BC (§9.10) e a biblioteca da UN (§9.11) — e a casca é a mesma:

- `RoomShell` desenha as duas paredes e o rodapé de `world/interior.ts`.
- `FurnitureLayers` monta a mobília do **"Furniture Kit"** da Kenney, uma `<Instances>` por primitiva
  de cada modelo, com troca de cor por nome de material. O kit guarda os GLB em `Models/GLTF format`,
  não em `GLB format` como os outros — daí o `sub` no [sync-models.mjs](scripts/sync-models.mjs).
- `Slab` é a caixa lisa que vira parede, rodapé ou prancha de estante.

Extrair isso foi o que impediu a biblioteca de nascer como cópia da agência — e é onde um terceiro
interior entra sem multiplicar o erro.

### 9.10 Agência do Banco Central (`scene/bank/BankBranch.tsx`)

O terceiro cenário do jogo, ao lado da cidade e do pátio. Fora o calendário de parede, é **cenário**:
o extrato mora todo na HUD (§10.3).
- O kit não tem balcão de banco nem cofre: o balcão é uma fila de `kitchenBar` com `kitchenBarEnd` nas
  pontas, e o cofre é o `kitchenFridgeLarge` repintado de aço (`metalLight`/`metalMedium`).
- **Os modelos entram em escala natural** (`useKenneyParts` sem `size`): o kit já é desenhado numa
  grade de 1×1, e normalizar peça a peça deixaria a lixeira do tamanho do sofá.
- Tudo instanciado por modelo, como o bosque — **90 draw calls** na agência inteira.
- A sala é **apertada de propósito** (7×4 ladrilhos): sobra de chão vazio vira espaço morto na tela.
- **As paredes não vêm do kit.** Os três modelos de parede têm recortes de janela e vão de porta: de
  cima e de perto viram uma silhueta serrilhada, com as emendas entre segmentos à mostra. Como aqui
  elas só fazem fundo de cena, são duas lajes lisas (mais um rodapé) pintadas com a paleta do tema —
  sem emenda e sem recorte. A cor é mais escura que `COLORS.wall`: no claro da página a parede sumiria
  contra o céu.
- A câmera é **direção × `BANK_DISTANCE`** (8,2), como a visão geral da cidade — calibrar é mexer num
  número só. O alvo fica **acima do chão** para a parede do fundo entrar no quadro em vez de só o piso.
- O **alvo da câmera fica à direita do centro da sala**, não no centro: o extrato cobre ~44% da direita,
  então mirar no meio do viewport jogaria a agência para trás do painel. A câmera, por sua vez, fica à
  direita do alvo — é o que traz o balcão (lado −x) para a frente. Polar ≈ 0,86 rad, dentro do limite
  0,55–1,05 do `CameraRig`.
- Não há clima dentro da agência — o `Weather` é da cidade.

**O que se mexe lá dentro.** A fila de animações é a mesma da cidade (`store/cityEvents.ts`); cada
cenário renderiza os tipos que conhece e ignora o resto.

| Evento | O que acontece | Quem dispara |
|---|---|---|
| Fatura vira `Pago` | malote entra pela porta, para no balcão, some no cofre e estoura moedas | `useBankEventDetector`, diffando status |
| Despesa vira `Pago` | o malote faz o caminho de volta, sem moedas — o dinheiro saiu | idem |
| Lançamento salvo | clarão curto sobre a tela do caixa | o `BankDetail`, no `onClose(true)` do formulário |

- **O id do evento é estável por lançamento** (`malote-f12`, sem `Date.now()`). A mutação otimista
  muda o status no cache e o refetch muda de novo: o detector dispara duas vezes para o mesmo
  pagamento, e o `push` — que filtra por id — substitui em vez de empilhar dois malotes.
- O **cofre não abre**: `useKenneyParts` assa as matrizes dos nós, então não existe porta separada
  para girar. O malote encolhendo ao entrar nele entrega a mesma leitura.
- O clarão do caixa **desenha a própria luz** em vez de mexer no material do monitor: aquele material
  é compartilhado pela instância do kit, e mutá-lo num `useFrame` deixaria o brilho preso se a
  animação fosse interrompida.
- Nada anima com movimento reduzido.

**Calendário de parede** (`WallCalendar.tsx`): grade 4×3 dos meses do ano, ano navegável, mês atual
destacado — clicar escreve `bankStore.setMes` e o extrato redesenha. É `<Html>` ancorado **sem
`transform`**: colar o DOM no plano da parede borra o texto, exige calibrar um `scale` em unidades de
mundo e quebra o teste de acerto (sob transformação 3D as caixas dos botões se sobrepõem e o clique
cai no mês errado). O `distanceFactor` prende o quadro à cena mesmo assim. **Precisa de
`pointer-events-auto`**: o portal dos rótulos é `pointer-events-none` e o drei só repõe `auto` no modo
`transform` — sem isso o canvas come o clique.

### 9.11 Biblioteca da Universidade (`scene/universidade/Library.tsx`)

O quarto cenário — e o primeiro em que **a cena é a navegação**: cada lombada da estante é um artigo
da wiki, e clicar nela abre o artigo no painel da direita (§10.4). Medidas em `world/universidade.ts`.

- A sala é menor que a da agência (6×3 contra 7×4): aqui o assunto é a estante, e cada fila de chão a
  mais só acrescenta bege vazio no rodapé do quadro. Câmera mais deitada pela mesma razão (polar ≈ 1,03
  contra ≈ 0,94 da agência), a `UNI_DISTANCE` de 6,4 e o alvo à direita da estante — o painel cobre a
  direita da tela.
- **A estante funcional não vem do kit** e é montada com caixas: os `bookcase*` têm as prateleiras
  internas numa altura fixa do modelo, e aqui a divisão é por projeto, vinda do dado. Os `bookcase*`
  do kit entram como decoração ao lado — é o que dá escala à funcional.
- **Todas as lombadas numa `<Instances>` só**, com uma caixa unitária escalada por instância: são até
  uma centena de livros e um `<mesh>` por livro custaria uma centena de draw calls. O `<Instance>` do
  drei faz o raycast por instância, então clique e hover por livro continuam funcionando, e `color` e
  `scale` vêm por instância. **78 draw calls** na biblioteca inteira.
- Livro em foco (hover ou aberto) é **puxado para a frente da prateleira** e clareado — a leitura de
  "livro meio tirado da estante". O aberto ainda sobe um fio.
- A etiqueta do título é **uma só**, que acompanha o livro em foco: montar e desmontar um `<Html>` a
  cada hover pisca (ver `SceneTag`).
- As etiquetas de nível (`ShelfLabel`) são `<Html>` ancorado **sem `transform`**, pela mesma razão do
  calendário da agência.
- Clicar no chão **fecha o artigo** em vez de limpar seleção: dentro da biblioteca não há entidade
  selecionada, mas o `onPointerMissed` do `<Canvas>` continua ativo (§16).

**O leitor (`Leitor.tsx`).** Um personagem senta à mesa lendo e, **a cada artigo aberto**, levanta,
vai até a lombada daquele artigo, pega e volta. Não é enfeite: é a confirmação de que o clique pegou,
e é o que liga o painel da HUD à cena.

| Fase | Animação do kit | Quando |
|---|---|---|
| `lendo` | `sit` | Parado na cadeira, com o livro aberto na mesa |
| `indo` | `walk` | Artigo aberto: percorre `caminhoAteAEstante` |
| `pegando` | `pick-up` | 1,1 s de frente para a prancha |
| `voltando` | `walk` | Volta pelo mesmo caminho, com o livro fechado na mão |
| `comemorando` | `emote-yes` | Copiou o artigo — e só se estiver sentado |

- **Os dois gatilhos são lidos dentro do `useFrame`**, comparando com o que já foi visto, em vez de
  em `useEffect`. São degraus da própria máquina de estados — num efeito, cada um viraria cascata de
  `setState` —, e o `useFrame`, por ser re-registrado a cada render, já enxerga o `livros` mais
  recente sem lista de dependências. Isso importa: a busca refaz `livros` a cada tecla, e um efeito
  com essa dependência mandaria o leitor à estante a cada letra digitada.
- O trajeto não é reta: `caminhoAteAEstante` desce para o corredor antes de virar, senão ele passaria
  por dentro da mesa e de quina na estante.
- **A altura (`LEITOR_ALTURA = 0,66`) saiu de uma escada renderizada**, não de conta. O boneco da
  Kenney é chibi — a cabeça vale ~40% da altura —, então a altura "realista" para o kit de móveis
  (~0,9) deixa a cabeça do tamanho da mesa.
- O kit traz ~30 clipes por personagem (`sit`, `pick-up` e `emote-yes` inclusive); o tipo
  `CharacterAnimation` lista só os que o jogo usa.
- **Não é montado com movimento reduzido**, como os pedestres da cidade. Por isso o copiar também
  solta um toast: confirmação de cópia não pode depender de uma animação que pode não existir — nem
  de o leitor estar no enquadramento.
- O grupo dele se chama `leitor`: é a alça pela qual os testes de navegador o acham no grafo.

---

## 10. HUD

Layout (`Game.tsx`): topo = barra · esquerda = KPIs em cima e **celular** embaixo · direita = inspector
em cima e **linha do tempo** embaixo. Tudo em `pointer-events-none` com filhos `auto`.

O celular morava na direita e a linha do tempo na esquerda; foram trocados porque o aparelho aberto
disputava a coluna do inspector — que é justamente onde um clique na cidade entrega o resultado. No
pátio e na agência não há celular, e os painéis de lá seguem como estavam (`YardPanel` e `BankBar` na
esquerda, `YardTable` na direita).

| Componente | Função |
|---|---|
| `TopBar` | Logo, nível, busca, seletor de distrito (≥ xl), lista/3D, controles de câmera (≥ lg), saúde, alerta de sincronização, sino, menu do usuário (sons, sair) |
| `DistrictSelector` | Visão geral, cada cliente (`CL-xx`) e cada landmark; no pátio mostra o projeto |
| `SearchPalette` | `/` — clientes, projetos, chamados, faturas, equipe, wiki; sem acento/caixa; setas + Enter |
| `KpiCards` | Contextuais: cidade → saldo/chamados/projetos; cliente → contrato/chamados/a receber; pátio → fila/entregues/bugs |
| `CameraToolbar` | Zoom, girar 90°, casa, modo construção (no pátio: nova atividade). `horizontal` na barra superior a partir de 1024px; vertical e flutuante abaixo disso (§10.2) |
| `Inspector` | Card por entidade, com ⌖/seguir, ↗ abrir no Angular, ✕ |
| `TimelineTray` | Ciclo de vida da entidade selecionada (ou do chamado mais urgente) |
| `Phone` | Celular do atendimento: fila de chamados e chat com o cliente (§10.1) |
| `BankPanel` · `BankBar` | Extrato da agência e a faixa de ações do Banco Central (§10.3) |
| `FormDrawer` | Painel lateral de formulários; `key` força formulário limpo |
| `Toasts` | Empilha; tom `xp` com gradiente |

`ui.tsx` reúne os átomos (`Glass`, `StatusChip`, `ProgressBar`, `KeyValue`, `Section`, `ListRow`, `Button`…);
`tones.ts` guarda `cx` e as classes de tom (separado para não quebrar o Fast Refresh).
`chamadoActions.ts` guarda a tabela `TRANSITIONS` (próximos status de um chamado), compartilhada pelo
inspector e pelo celular.

### 10.1 Celular do atendimento (`hud/phone/`)

Ocupa o canto inferior direito — o lugar da antiga `EntityTable`. É um aparelho desenhado com os
tokens do tema (corpo `bg-ink`, tela clara), com um app de duas áreas na barra de tarefas:
**Chamados** e **Chat**.

| Arquivo | Tela |
|---|---|
| `Phone.tsx` | O aparelho: barra de status, ilha, recolher/expandir |
| `PhoneApp.tsx` | Casca: tela atual + barra de tarefas + indicador de home (que **é** o botão de recolher) |
| `ChamadosScreen.tsx` | Busca, filtros de prioridade/origem, abas Abertos · Em andamento · Fechados |
| `ChamadoScreen.tsx` | Detalhe — mesma estrutura do portal Angular, **sem** o bloco de mensagens |
| `ConverterScreen.tsx` | Chamado → caixa no pátio, com prazo obrigatório |
| `ChatScreen.tsx` · `ConversaScreen.tsx` | Conversas (uma por cliente) e a linha do tempo da conversa |

Regras puras em `world/phone.ts` (testadas em `phone.test.ts`); navegação e filtros em
`store/phoneStore.ts`. Dimensões: **a mesma largura do inspector** (`min(352px, 100vw-32px)`), para que
os dois formem uma coluna só; `min(640px, 100vh-92px)` aberto e 124px recolhido — é a **altura do
contêiner** que anima (desligada com movimento reduzido).

**De onde vem cada dado.**
- A listagem filtra `world.chamados` **no cliente** — nenhuma chamada nova, e o "Live" de 30 s
  continua valendo. Os quatro status do backend viram três abas: `Resolvido` mora junto com
  `Fechado` (é um fechado que o cliente ainda pode reabrir).
- A conversa de um cliente é a **união das threads dos chamados dele** — ver a armadilha em §16.
  As mensagens só são buscadas ao abrir a conversa (`useMensagensDoCliente`, no máximo 20 threads).
- O selo do aparelho e da aba conta **chamados abertos**. Não existe "não lida": o backend não
  guarda esse estado, e um contador inventado mentiria.

**Comportamentos que não são óbvios.**
- Aberto, o celular **tapa a metade esquerda da cena**. Enquanto houver algo selecionado ele fica
  recolhido, e volta sozinho ao estado escolhido pelo usuário quando a seleção é limpa — quem clica
  num prédio quer ver a cidade e o inspector, não a lista de chamados. É uma reação ao **estado**
  (`selected !== null`), não ao evento, para também valer ao abrir a página com `?sel=` na URL; o
  `focusNonce` entra junto só para o caso de trocar de entidade com o aparelho reaberto por cima. O
  recolhimento automático **não** vira preferência; só o botão do usuário persiste (`recolher` vs.
  `setAberto`).
- O celular mora no canto inferior **esquerdo**; quem limita a coluna do inspector agora é a linha do
  tempo, à direita: `lg:bottom-[174px]` são os 142px medidos dela mais as folgas (no pátio, 300px para
  a `YardTable`).
- `Esc` volta uma tela, depois recolhe, e só então segue a cadeia global (ver §14).
- Digitar no campo de resposta não dispara os atalhos globais (`isTyping`), mas o `Esc` é tratado
  **antes** dessa guarda — o `<input>` trata `Escape` e chama `stopPropagation`.
- No pátio o celular não existe: a `YardTable` continua ali.
- A **barra de status faz as vezes do antigo chip "Live"**: o relógio é o relógio, e o wifi reflete a
  sincronização — pulsa com `useIsFetching()` (sem pulsar com movimento reduzido) e vira `WifiOff`
  vermelho quando `useWorld().isError`. Só o wifi muda de cor; bateria vermelha leria como pouca carga.

### 10.2 Barra superior: onde moram os controles de câmera

A `CameraToolbar` tem duas casas, e **só uma existe por vez** — não é `hidden`/`block`, é renderização
condicional: dois elementos com `data-tour="toolbar"` no DOM fariam o tour destacar o invisível
([Tour.tsx](src/hud/Tour.tsx#L57) usa `querySelector`).

| Largura | Onde | Quem decide |
|---|---|---|
| ≥ 1024px | Barra superior, horizontal, ao lado do botão de lista | `TopBar` com `useIsDesktop()` |
| 768–1023px | Coluna da direita, vertical | `Game.tsx` (`!desktop`) |
| < 768px | Flutuante sob a barra, vertical | ramo `isMobile` do `Game.tsx` |

No modo lista a pílula some dos dois lugares: controle de câmera sem canvas não comanda nada.

**A barra é um orçamento de largura, não uma lista.** Com os seis botões dentro (≈226px), só cabe
tudo a partir de 1440px. Duas regras seguram isso:

- o contêiner da busca tem `min-w-0` (sem ele um item flex não encolhe abaixo do conteúdo, e a barra
  transbordava — inclusive **antes** desta mudança) e um piso de 200px para continuar legível;
- o seletor de distrito só aparece a partir de `xl`, e seus rótulos usam `max-w-32` até `2xl`. Entre
  `lg` e `xl` o espaço vai para os controles de câmera; a navegação por distrito continua na busca (`/`)
  e nos próprios prédios.

Medido em 1024, 1280, 1440 e 1920: `scrollWidth === clientWidth` na barra em todas.

### 10.3 Extrato da agência (`hud/bank/`)

Abre pelo botão **"Ver conta bancária"** no inspector do Banco Central e troca o cenário inteiro,
como entrar no pátio (§7). Ocupa a coluna da direita (680px) do topo à base; no celular vira folha
inferior — 68dvh na lista e 88dvh no formulário, que precisa de mais folga.

| Arquivo | Papel |
|---|---|
| `BankPanel.tsx` | Abas Faturas · Despesas, navegador de mês, resumo, busca e filtros |
| `FaturasExtrato.tsx` · `DespesasExtrato.tsx` | As duas listas, com as ações de cada linha |
| `BankDetail.tsx` | Painel da **esquerda**: leitura do lançamento e, no "Editar", o formulário |
| `parts.tsx` | `MesNav`, `ResumoBloco`, `LinhaExtrato`, `AcaoLinha`, filtros |
| `BankBar.tsx` | Faixa inferior esquerda: saldo realizado, Cidade, Recorrentes |

A disposição é a de `financeiro/faturas` do MrCodeAdmin (mês no topo, resumo, filtros, lista agrupada
por dia) com os tokens e os átomos daqui.

**Dentro da agência não há entidade selecionada** — por isso o `Game` não monta o inspector, o celular
nem os KPIs da cidade lá dentro.

**Clicar numa linha abre a leitura, não a edição.** O detalhe mora num painel de 360px à **esquerda**
do extrato, então a lista continua à vista o tempo todo; o botão "Editar" troca aquele mesmo painel
pelo formulário. Abaixo de 1280px os dois não cabem lado a lado e o mesmo componente vira uma tela
dentro do extrato (`detalheEmbutido`) — um componente, dois contêineres.

**O formulário nunca é o `FormDrawer`.** Com o extrato na coluna da direita, o drawer lateral caía
exatamente em cima dele: um painel sobre o outro. Por isso fatura e despesa **não têm entrada em
`DrawerState`**. `onClose(true)` do formulário significa "salvou" e é o que acende a tela do caixa lá
na sala; o Cancelar chama `onClose()` sem argumento.

O `Esc` desce a escada do `bankStore`: formulário → detalhe → agência → cidade.

### 10.4 Biblioteca da Universidade (`hud/wiki/`)

Abre pelo botão **"Entrar na biblioteca"** no inspector da Universidade — ou clicando num artigo da
lista dele, que já entra com ele aberto. Mesma coluna e mesma largura do extrato (680px); no celular,
folha inferior de 62dvh no índice e 88dvh no artigo, porque aí o que importa é o texto.

| Arquivo | Papel |
|---|---|
| `WikiPanel.tsx` | Índice (busca + prateleiras) e artigo — as duas telas do `wikiStore` |
| `LibraryBar.tsx` | Faixa inferior esquerda: tamanho do acervo, Cidade, Novo artigo (↗) |

O artigo segue a ordem do `wiki-detail` do portal: sobrancelha com o projeto (ou "Geral"), título,
autor e datas, conteúdo, e o ↗ para editar no MrCodeAdmin. O **Copiar** leva o artigo em texto puro
(`stripHtml`) para a área de transferência, confirma por toast e manda o leitor da cena comemorar
(§9.11) — se o `navigator.clipboard` falhar (contexto não seguro, permissão negada), o toast avisa e
nada é animado.

**O índice lista todos os artigos de cada prateleira**, inclusive os que não couberam na prancha
(marcados como "fora da prancha"). A estante é a navegação bonita; o painel é a completa — e a única
que funciona por teclado, já que uma malha 3D não recebe foco. Por isso `Prateleira` carrega **duas**
listas: `paginas` (o que virou lombada) e `todas` (o grupo inteiro). Listar `paginas` no painel foi o
primeiro jeito, e o artigo que não coubesse na prancha ficava inalcançável.

**Artigo apagado com o painel aberto.** O "Live" revalida a cada 30 s e o artigo some da lista; o
painel cai no aviso "este artigo saiu da biblioteca", não numa tela em branco. Não há `GET /Wiki/{id}`
aqui: o `GET /Wiki` já devolve o `conteudo` de todos (conferido no `WikiPaginaService.ObterTodos` do
backend), então buscar o detalhe por id seria um request a mais pelos mesmos bytes que já chegaram.

**O conteúdo é parseado para elementos React, não injetado** (`lib/wikiContent.tsx`) — ver §16.

**Acervo de exemplo.** A wiki de um ambiente local costuma estar vazia, e aí não dá para ver a
divisão por prateleira nem o artigo renderizado. `api/mockWiki.ts` enche a estante com 17 artigos —
títulos de tamanhos variados (a grossura da lombada vem do título) e corpos que exercitam o
renderizador: títulos, listas, código, tabela, citação, link e um artigo em texto cru.

**Só existe em dev** (`import.meta.env.DEV`), e em duas situações: quando a wiki volta **vazia** (não
há dado real para esconder, então entra sozinho — pedir uma flag para ver a feature é atrito sem
contrapartida) e quando a URL traz `?mock=wiki` (força mesmo havendo wiki de verdade). Com artigo
real e sem a flag, o exemplo **não** entra.

O acervo é montado em cima dos **projetos reais** do ambiente, então as etiquetas da estante mostram
nomes de verdade; sem projeto nenhum tudo cai na "Geral". O painel e a barra exibem o chip
**"exemplo"** enquanto ele está ativo (`useWorld().wikiDeExemplo`): dado falso que não se anuncia é
pior que estante vazia.

A substituição acontece no `useWorld`, e não dentro da query, porque é lá que a lista de projetos já
existe. Isso faz o acervo valer para a HUD inteira — placa da Universidade, inspector, busca e
**XP da gamificação**. É de propósito: biblioteca cheia com a placa dizendo "0 artigos" seria pior.
Em dev, portanto, a wiki vazia soma 255 XP de exemplo.

O `Esc` desce a escada do `wikiStore`: artigo → biblioteca → cidade.

### 10.5 Metas da Prefeitura (`hud/inspector` + `hud/forms/MetaForm.tsx`)

A Prefeitura deixou de ser a tela de contratos e equipe — isso foi para o **Escritório** — e virou o
gerenciador das metas de XP: objetivos que a equipe combina, com prazo e recompensa.

O painel lista as metas agrupadas por situação (**em andamento**, agendadas, cumpridas, expiradas),
com barra de progresso e o placar de bônus no cabeçalho; clicar numa meta abre a edição no drawer.
O formulário tem título, métrica, alvo, recompensa e janela — e o campo de **responsável só aparece
em chamados e atividades**, as duas únicas métricas com dono no backend.

O formulário **não usa `react-hook-form` + zod**, ao contrário dos outros: aqueles falam com a API e
precisam casar erros de campo vindos do servidor (`applyServerErrors`). Este grava num store local, e
a validação já existe pura e testada em `erroDaMeta` — um segundo esquema só criaria duas fontes de
verdade para a mesma regra.

A aba **Missões** do painel do jogo mostra as metas em andamento e as recém-batidas, acima das seis
missões fixas da semana. Agendadas e expiradas ficam só na Prefeitura: ali o painel é sobre o que dá
para fazer agora.

### Tema

Tokens no `@theme` de `index.css` (`brand`, `ink`, `surface`, `ok/warn/bad/info`, `shadow-card/float`).
Cor da marca `#134ced`. Tema claro "maquete"; `prefers-reduced-motion` reduz animações.

---

## 11. Funcionalidades do sistema

### Leitura

| Recurso | Onde aparece |
|---|---|
| Clientes e contratos | Sedes; inspector de cliente; Escritório |
| Projetos | Canteiros; inspector (cronograma, marcos, equipe, quadro) |
| Chamados | Caminhões; inspector; celular (aba Chamados); sino |
| Mensagens do chamado | Celular, aba Chat — uma conversa por cliente |
| Faturas e despesas | Banco; KPIs; inspector de fatura; **extrato da agência** (§10.3) |
| Wiki | Universidade; **biblioteca** (§10.4) — o artigo é lido no jogo, a edição abre o Angular |
| Equipe | Escritório; pedestres e empilhadeiras |
| Metas de XP | Prefeitura (§10.5) e a aba Missões do painel do jogo |
| Observabilidade | Data Center (desligada em dev) |
| Dashboard | Saldo do mês, variação, contratos a vencer |

### Escrita

| Ação | Como |
|---|---|
| **Construir sede** (criar cliente) | Tecla `B` → fantasma no próximo lote → formulário |
| Editar / ativar / desativar cliente | Inspector do cliente (preserva `idSistemaOrigem` — o `PUT` sobrescreve) |
| **Abrir canteiro** (projeto) | Inspector do cliente → "Novo" |
| **Abrir chamado** interno | Inspector do cliente → "Abrir" |
| Iniciar / resolver / fechar / reabrir / assumir chamado | Inspector do chamado ou celular (otimista) |
| **Responder o cliente** | Celular → Chat → conversa do cliente (vai para a thread do chamado em foco) |
| **Converter chamado em tarefa** | Inspector do chamado (caminhão → painel lateral) **ou** celular → detalhe → "Converter em tarefa". Nos dois: projeto, zona e **prazo obrigatório**, que vira mensagem automática no chat |
| **Registrar pagamento** | Inspector da fatura ou extrato da agência (dispara o carro-forte) |
| **Emitir / editar fatura**, estornar, cancelar | Agência → aba Faturas |
| **Lançar / editar despesa**, pagar, estornar | Agência → aba Despesas |
| **Gerar recorrentes** (faturas e despesas do mês) | Agência → barra inferior |
| **Ler um artigo da wiki** | Universidade → "Entrar na biblioteca" → clicar numa lombada da estante |
| **Copiar um artigo** | Biblioteca → artigo → "Copiar" (texto puro para a área de transferência) |
| **Criar / editar / remover meta** | Prefeitura → "Nova meta" (ou clicar numa meta) |
| **Mover caixa** (atividade) | Arrastar entre zonas ou "Mover para a zona" |
| Criar/editar/remover atividade, comentar | Pátio / inspector da atividade |
| Criar/renomear/reordenar/remover zona | Etiqueta da zona no pátio |
| Notificações | Marcar lida / todas; clicar leva ao chamado |

> **Contrato de API para quando as metas forem para o backend:** `GET /Gamificacao/metas`,
> `POST`, `PUT /{id}`, `DELETE /{id}` e `POST /{id}/cumprir` (grava quem bateu, quando e quanto),
> com o mesmo shape de `Meta` e `MetaCumprida` de `world/metas.ts`. O jogo precisaria trocar o
> `metasStore` por queries/mutações; o resto — regras, telas e testes — já é independente de onde o
> dado mora.

### Fora do escopo do jogo (continua no MrCodeAdmin/Angular)

Editor rico da wiki e upload de imagens, aprovação pública de contrato, edição de contratos, gestão de
equipe (CRUD de colaboradores). Os inspectors têm o botão ↗ para abrir a tela correspondente.
O financeiro saiu desta lista: desde a agência (§10.3), faturas e despesas são criadas e editadas aqui.
A **leitura** da wiki também saiu: desde a biblioteca (§10.4) o artigo é lido no jogo. Criar, editar e
excluir continuam no Angular — o editor rico com upload é uma feature inteira por si.

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
| **Meta cumprida** | o que a meta prometeu (até 1000, §12 "Metas") |

**Premia resultado:** reabrir um chamado remove o XP dele automaticamente.

### Metas da equipe

As seis missões da semana são fixas no código. As **metas** são escritas pelo usuário na Prefeitura
(§10.5) — título, métrica, alvo, janela e recompensa —, mas o progresso continua vindo do dado real,
recortado pela janela. As regras são puras, em `world/metas.ts`:

- cada métrica tem a sua data no DTO: `dataCadastro` (clientes), `dataCriacao` (contratos, wiki),
  `dataConclusao` (projetos, atividades), `dataHoraUltimaAtualizacao` (chamados resolvidos),
  `dataPagamento` (faturas e receita);
- a janela é **inclusiva nos dois extremos e em horário local** (§16);
- **meta por pessoa só existe para chamados e atividades** — são os dois únicos DTOs com
  `idUsuarioAdminResponsavel`, e é por isso que o ranking semanal também só pontua esses dois;
- a recompensa vai até **1000 XP**. Não é regra de negócio, é guarda: sem teto, uma meta emite cinco
  níveis de uma vez e os desbloqueios deixam de significar algo.

**A meta cumprida é registrada e fica registrada.** O progresso é recalculado a cada refetch, e um
chamado reaberto sai de "resolvidos" — sem gravar o pagamento, o bônus seria pago de novo a cada
carga ou sumiria depois de conquistado. O registro guarda o XP e o título, não só a data, para o selo
sobreviver a uma edição da meta.

> **O XP deixa de ser reproduzível a partir do backend.** Esta é a única parcela que não sai dos
> dados: ela vem do `localStorage` (`mrcode-city:metas:<id>`, chave separada da do progresso, que é
> reescrita a cada tique). Duas máquinas com o mesmo banco podem mostrar níveis diferentes. É
> consequência direta de a recompensa ser em XP, e está em §17.

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
| Chamado | `GET`, `GET /{id}`, `POST /interno`, `PATCH /{id}/status`, `PATCH /{id}/responsavel`, `POST /{id}/converter-atividade`, `GET/POST /{id}/mensagens` |
| Fatura | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `PATCH /{id}/pagar|estornar|cancelar`, `POST /gerar-recorrentes` |
| Despesa | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `PATCH /{id}/pagar|estornar`, `POST /gerar-recorrentes` |
| Financeiro | `GET /resumo?mes=aaaa-MM` |
| Wiki | `GET` (devolve o DTO inteiro, `conteudo` incluído — por isso a biblioteca não busca por id) |
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
- A mensagem do chamado é **mão dupla**: a equipe escreve em `POST /Chamado/{id}/mensagens` e o cliente
  no `/{id}/mensagens/externa` (autenticado por API key do sistema de origem). O conteúdo é HTML —
  o texto digitado passa por `textToHtml`, e o que vem da API por `stripHtml` antes de virar balão.
- `POST /Chamado/{id}/converter-atividade` aceita só `{ idProjeto, idColuna }`. O prazo entra depois,
  por `PUT /Kanban/atividades/{id}` (ver §6.4).

---

## 14. Atalhos e navegação

| Tecla | Ação |
|---|---|
| `/` | Abrir busca |
| `L` | Alternar cidade 3D ⇄ lista |
| `Esc` | Fecha, em ordem: busca → painel do jogo → formulário → tela do celular → celular → modo construção → **painel do interior** (formulário → detalhe na agência; artigo na biblioteca) → **sai do interior** → seleção → pátio |
| `B` | Modo construção (no pátio: nova atividade) |
| `G` | Painel do jogo |
| `Q` / `E` | Girar 90° |
| `H` | Visão geral (no pátio: enquadrar zonas; num interior: reenquadrar a sala) |
| `+` / `−` | Zoom |
| `W A S D` / setas | Pan |

Atalhos são ignorados enquanto se digita em campos ou com busca/formulário abertos — **menos o `Esc`**,
que é tratado antes dessa guarda. Por isso o campo de resposta do chat trata `Escape` por conta própria
(desfoca e chama `stopPropagation`): sem isso, apertar `Esc` no meio de uma frase limparia a seleção da
cidade.

Mouse: esquerdo arrasta o mapa, direito gira, roda dá zoom, duplo clique num canteiro entra no pátio.
Na biblioteca, clicar numa lombada abre o artigo e clicar no chão o fecha.

### Os quatro cenários

| Cenário | Como entra | Como sai | Estado |
|---|---|---|---|
| **Cidade** | padrão | — | `yard = null`, `interior = null` |
| **Pátio de obras** | duplo clique num canteiro, ou "Abrir pátio" no inspector do projeto | botão Cidade · `Esc` | `yard = <idProjeto>` |
| **Agência do BC** | "Ver conta bancária" no Banco Central | botão Cidade · `Esc` · ✕ do extrato | `interior = 'banco'` |
| **Biblioteca da UN** | "Entrar na biblioteca" na Universidade, ou clicar num artigo da lista dela | botão Cidade · `Esc` · ✕ do painel | `interior = 'universidade'` |

Os três cenários não-cidade são **mutuamente exclusivos**, e selecionar qualquer coisa da cidade
(busca, notificação, distrito) sai de onde estiver. Tudo isso é um par de campos no `uiStore` —
`yard` e `interior` —, espelhado na URL (§3 e §7).

---

## 15. Testes e qualidade

```bash
npm test         # vitest — 229 testes
npm run lint     # oxlint — zero avisos
npx tsc -b       # tipos (app + configs + e2e)
E2E_EMAIL=... E2E_PASSWORD=... npm run e2e   # Playwright — 6 testes
```

### E2E (`e2e/smoke.spec.ts`)

**Somente leitura** — nenhum teste grava no MrCodeAdmin (o de formulário prova que a validação barra o envio).
Usam o **modo lista** (rápido, sem WebGL) e marcam o tour como visto; um teste de fumaça confirma o canvas 3D.

| Teste | Garante |
|---|---|
| modo lista + inspector | dados chegam, seleção abre o card |
| busca `/` | paleta, filtro e seleção |
| painel do jogo `G` | 5 abas acessíveis (`role=tab`) |
| quadro em lista | colunas e inspector da atividade |
| validação de formulário | zod bloqueia sem chamar `PUT /Cliente` |
| cidade 3D | canvas renderiza |

Variáveis: `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_BASE_URL` (padrão `http://localhost:5173`), `E2E_CHANNEL`
(padrão `chrome` = Chrome instalado; no CI use `npx playwright install chromium` e `E2E_CHANNEL=`).

### CI

`.github/workflows/ci.yml` roda em todo push/PR: `npm ci` → lint → `tsc -b` → `npm test` → build com
`VITE_BASE=/city/`. Os E2E não rodam no CI porque dependem do backend com dados.

### Unitários (`src/world/*.test.ts`)

Tudo que é regra mora em `world/`, que é puro e roda em **node, sem DOM** — daí os testes serem
rápidos e determinísticos. Toda função que depende de relógio recebe `agora` por parâmetro; nenhuma
chama `Date.now()` por dentro.

| Arquivo | Cobre |
|---|---|
| `world.test.ts` | Layout estável, vagas de caminhão, fileira cívica, posições, status, ciclo de vida, rotas |
| `yard.test.ts` | `moveAtividade` (espelho do backend), estatísticas, layout do pátio, drop |
| `gamification.test.ts` | XP (com e sem bônus de meta), níveis, saúde, semana, missões, ranking, conquistas |
| `metas.test.ts` | Janela em horário local, progresso por métrica, meta por pessoa, situação, registro, validação |
| `extrato.test.ts` | Mês, recorte por data, filtros, agrupamento por dia, totais, grade do ano |
| `bank.test.ts` | Planta da agência, paredes, balcão, caminho do malote, calendário, câmera |
| `universidade.test.ts` | Prateleiras por projeto, lombadas, estante, trajeto do leitor, câmera |
| `phone.test.ts` | Abas, filtros, conversas, blocos do chat, prazo da conversão |
| `signs.test.ts` | Âncoras, recorte de rótulo, opacidade e **folga entre prédios, placas e decoração** |
| `outskirts.test.ts` | Bosque determinístico, espaçamento, alcance |

### Verificação no navegador (roteiros de desenvolvimento)

O que não é regra pura — layout da HUD, enquadramento da câmera, clique em objeto 3D, animação — é
verificado com **Playwright + Chrome**, em roteiros descartáveis que vivem fora do repositório. É o
principal instrumento de qualidade deste projeto, e tem particularidades que custaram caro:

- **O navegador é o Chrome instalado** (`chromium.launch({ channel: 'chrome' })`): os binários do
  Playwright não estão baixados nesta máquina.
- **Interceptar a API com matcher de função**, `(url) => url.pathname.startsWith('/api/')` — e **não**
  com o glob `**/api/**`, que também casa os módulos-fonte servidos pelo Vite e quebra a página.
- As respostas vão no envelope `{ isSuccess, message, data, errors }`; `/Dashboard/resumo` e
  `/Observabilidade/resumo` aceitam `null`.
- Semear `mrcode_token`, `mrcode_usuario` e `mrcode-city:tour:<id>` no `addInitScript`, senão o app
  cai no login e o tour cobre a tela.
- Dirigir o estado pelas alças `window.__ui` / `__game` / `__metas` (§3) em vez de caçar botões.
- **Para mirar um objeto 3D**, projetar com `window.__r3f`: pegar a `InstancedMesh`, ler
  `getMatrixAt(i)`, aplicar `matrixWorld` e `project(camera)` — foi assim que o clique em cada lombada
  da estante foi verificado. Objetos com grupo próprio (o leitor) recebem `name` e são achados com
  `scene.getObjectByName`.
- Em ambiente sem GPU o render por software roda a ~1 fps: usar esperas longas (3–4 s depois do
  `goto`) antes de qualquer leitura.
- **Escalas e enquadramentos saem de escadas renderizadas**, não de conta: zoom da agência, zoom da
  biblioteca e altura do leitor foram escolhidos comparando quatro imagens lado a lado.

---

## 16. Convenções e armadilhas conhecidas

- **Comentários explicam o porquê**; regras de negócio ficam em `world/`, nunca em componentes.
- Componentes só exportam componentes (Fast Refresh); helpers vão para arquivos `.ts` próprios
  (`tones.ts`, `serverErrors.ts`, `crateColors.ts`, `origemColor.ts`).
- Sem `Date.now()`/`Math.random()` durante o render — use `useNow()` ou estado inicial preguiçoso.
- **`<Html>` do drei:** mantenha montado e alterne `visible`; use `labelsPortal`.
- **Textura de canvas:** sempre `texture.colorSpace = SRGBColorSpace`. O `Canvas` usa `flat`
  (NoToneMapping) e sem isso bytes já em sRGB são reencodados como lineares — o azul da marca (#134ced)
  sai lavado.
- **Texto 3D:** não use o `<Text>` do drei sem antes resolver a fonte (§9.7) — ele recusa `.woff2`, que
  é o único formato que o projeto tem, e cai num CDN externo.
- **`renderer.info` com pós-processamento:** o `autoReset` zera o contador a cada `render()`, e o
  `EffectComposer` faz vários por quadro — ler direto dava "1 draw call". `PerfProbe` desliga o
  `autoReset` e zera à mão uma vez por quadro.
- **A origem dos GLB da Kenney fica num canto, não no centro.** No kit de móveis o ladrilho vai de 0 a
  1 em x e de −1 a 0 em z, e algumas peças descem abaixo do zero. O `FurnitureLayers` mede a caixa das
  geometrias e recentra em x/z apoiando em y = 0 — é isso que deixa `world/bank.ts` e
  `world/universidade.ts` legíveis como planta baixa. Posicionar pelo valor cru do GLB desloca tudo
  meio ladrilho.
- **`<Html>` do drei dentro do portal de rótulos não recebe clique.** O contêiner é
  `pointer-events-none` e o drei só repõe `pointer-events: auto` no modo `transform` — num `<Html>`
  comum o canvas intercepta tudo. Quem tem botão precisa de `pointer-events-auto` no próprio
  elemento (ver o calendário da agência, §9.10).
- **Animação disparada por diff de dados dispara duas vezes com mutação otimista.** O status muda no
  cache e de novo no refetch. O id do evento tem que ser **estável por registro**, nunca com
  `Date.now()`: o `push` de `cityEvents` filtra por id e substitui em vez de empilhar.
- **Dois painéis na mesma coluna = um em cima do outro.** O `FormDrawer` mora em `right-4`, o mesmo
  lugar do extrato da agência: abrir um formulário de lá empilhava as duas superfícies. Quando o
  painel já é uma superfície própria, o formulário deve ser uma **tela dele** (§10.3), não um drawer.
- **Linha de lista com ações: não aninhe botões.** A linha do extrato começou como um `div
  role="button"` com os botões de ação dentro; o nome acessível da linha passou a incluir "Marcar como
  paga" e o clique caía na linha (abrindo a edição em vez de pagar) — mesmo com `stopPropagation`. O
  certo é o botão da linha ser **irmão** das ações.
- **Mensagem é por chamado, não por cliente.** A "conversa com o cliente" do celular é a união das
  threads dos chamados dele; responder exige escolher **qual** chamado recebe o `POST`. Por isso o campo
  mostra o protocolo de destino, e sem chamado nenhum ele fica desabilitado.
- **`PUT /Kanban/atividades/{id}` substitui o registro inteiro** — reenvie título, descrição, tipo,
  prioridade e responsável junto com o campo que mudou.
- **Flag de "primeira execução" em `useEffect` não funciona:** o `StrictMode` monta duas vezes em dev e
  o `ref` sobrevive ao remonte simulado. Para reagir só a mudanças de verdade, **compare o valor
  anterior** (`Phone.tsx` faz isso com o `focusNonce`).
- **HTML de outra aplicação não vai para `dangerouslySetInnerHTML`.** O corpo do artigo da wiki é
  HTML escrito no editor do MrCodeAdmin; o Angular joga num `[innerHTML]`, que passa pelo
  `DomSanitizer` dele, e o React **não tem equivalente**. Em vez de sanitizar e injetar,
  `lib/wikiContent.tsx` **parseia para elementos React**: só as tags de uma tabela são construídas e só
  os atributos mapeados (`href` http(s)/mailto, `src`, `alt`, `colspan`/`rowspan`) chegam ao DOM —
  `style`, `class`, `id` e qualquer `on*` ficam de fora por construção. A diferença importa: num
  pipeline "sanitiza e injeta", um furo no sanitizador vira execução de script; aqui o pior caso é
  conteúdo que não aparece. O preço é não haver teste de unidade (não há `DOMParser` no vitest em
  node) — a verificação é no navegador, com um artigo cheio de `<script>`, `onerror=` e `javascript:`.
- **Link recusado não pode parecer link.** Um `<a href="javascript:…">` vira `<span>`: azul e
  sublinhado sem destino é promessa falsa de clique.
- **`onPointerMissed` continua ativo nos cenários internos.** Lá não há entidade selecionada, mas o
  handler do `<Canvas>` dispara a cada clique no vazio: na biblioteca ele **fecha o artigo** em vez de
  chamar `clearSelection`.
- **Uma `<Instances>` para o que é clicável em quantidade.** As lombadas da estante seriam ~100 draw
  calls como `<mesh>` separados; o `<Instance>` do drei faz raycast por instância, então clique, hover,
  cor e escala continuam por livro com **um** draw call (§9.11).
- **A cena 3D não é alcançável de fora.** A câmera do R3F não fica dentro da cena e o canvas não
  publica a raiz — daí o `window.__r3f` sob `import.meta.env.DEV` (§7), sem o qual um teste de
  navegador não consegue mirar um objeto 3D.
- **`textContent` cola blocos vizinhos.** Resumir um artigo com `stripHtml` direto dava
  "…o tempo todoTermoO que é" — não há separador entre `</h2>` e o `<td>` seguinte. `format.resumo`
  insere um espaço antes dos fechamentos de bloco antes de achatar.
- **Dado de exemplo tem que se anunciar — e nunca cobrir dado real.** O acervo da biblioteca só
  existe em dev e só entra com a wiki **vazia** (ou forçado por `?mock=wiki`); a HUD mostra o chip
  "exemplo" enquanto está ativo, porque quem olha a tela não tem outro jeito de saber. O primeiro
  desenho exigia a flag sempre, e o resultado foi abrir a biblioteca e ver prateleira vazia.
- **Data de dia inteiro nunca passa por `Date(string)`.** `new Date('2026-11-01')` é lido como UTC e,
  em fuso negativo, vira 31/10 — a meta perderia o primeiro dia e o `formatDateShort` mostraria a
  data errada. `world/datas.ts` monta tudo a partir dos pedaços, em horário local.
- **Posição de prédio e de decoração moram na mesma camada pura.** `LANDMARKS` e `DECOR_SPOTS` são
  cruzados em `signs.test.ts`. Antes a coordenada da decoração só existia no componente, e o quinto
  prédio cívico foi plantado em cima do monumento sem nada acusar.
- **Fileira cívica com número ímpar não pode ser centrada em 0** — o prédio do meio cai em cima da
  fonte da praça. Ela é deslocada meio passo de propósito.
- **Recompensa que não se registra se paga duas vezes.** Progresso derivado de dado oscila (um
  chamado reaberto sai de "resolvidos"); o que foi conquistado precisa de registro próprio, senão o
  bônus volta a ser pago a cada carga ou simplesmente some.
- **`PUT /Cliente`** sobrescreve `idSistemaOrigem` — sempre reenviar o valor atual.
- **Mover atividade** exigiu correção no backend (conflito de tracking do EF em
  `KanbanDomainService.ReordenarAtividadesDaColuna`) — sem ela, o `PATCH` retorna 400.
- **Numeração de faturas** (`FaturaDomainService.GerarProximoNumero`) usa o maior sequencial do ano, não a
  contagem — evita duplicidade quando `DataEmissao` diverge do ano do número.
- `camera-controls` trata o `pointerdown` antes do R3F → desabilite o controle durante arrastes.
- Tokens JWT expiram; em testes automatizados renove o token.
- `exitYard(false)` / `exitInterior(false)` saem sem selecionar a sede de origem (usado ao ir para a
  visão geral).

---

## 17. Limitações e roadmap

| Limitação | Motivo / caminho |
|---|---|
| Linha do tempo sem horário por etapa (só a atual) | Backend sem histórico de status → tabela `historico_status` |
| Conquistas só no navegador | Persistir no backend (`gamificacao_*`) e ranking compartilhado |
| **Metas e o XP de bônus só no navegador** | Mesma tabela `gamificacao_*`: a meta é de quem a criou, não da equipe, e o nível da cidade deixa de ser reproduzível só com o backend (§12) |
| "Live" por polling (30 s) | SignalR com eventos de domínio |
| Observabilidade vazia em dev | Flag de mock no backend |
| Arrasto de caixas não testado em tela de toque real | Validar em dispositivo |
| Editor da wiki continua no Angular | O editor rico com upload de imagens é uma feature inteira (§11) |
| Nomes de cliente com mojibake (`SoluÃ§Ãµes`) | UTF-8 lido como Latin-1 **no backend/banco** — o jogo só exibe o que recebe |
| ~50 draw calls por cliente | Instanciar sedes/caminhões quando passar de ~15 clientes (§20) |
| Conquistas e tour "visto" só no navegador | Persistir no backend |
| Deploy automático do City | Decidir se entra no `cd.yml` do MrCodeAdmin (§19) |

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

---

## 19. Deploy

O City é estático (pasta `dist/`) e deve ficar **no mesmo domínio do MrCodeAdmin**: assim `/api` funciona sem
CORS e os links "Abrir no MrCodeAdmin" (caminhos relativos, `adminUrl = ''` em produção) apontam para o Angular.

```bash
VITE_BASE=/city/ npm ci && npm run build      # base path → assets em /city/assets/...
rm -rf /opt/mrcodecity/* && cp -r dist/* /opt/mrcodecity/
chown -R www-data:www-data /opt/mrcodecity
```

No Nginx do MrCodeAdmin, cole [`deploy/nginx-city.location.conf`](../deploy/nginx-city.location.conf) dentro
do `server { }` existente (antes do `location /`) e rode `sudo nginx -t && sudo systemctl reload nginx`.
Resultado: `https://admin.mistercode.com.br/city/`. Arquivos com hash recebem cache de 1 ano; o `index.html`, não.

**Pacotes gerados** (gzip): entrada + `vendor` ≈ 85 KB (tela de login) · `Game` ≈ 78 KB · `r3f` ≈ 176 KB ·
`three` ≈ 187 KB · `CityScene` ≈ 14 KB. O three.js só é baixado depois do login.

> Não há workflow de deploy automático neste repositório: incluir o City no `cd.yml` do MrCodeAdmin
> (que faz `git pull` + build na VPS) é uma decisão de infraestrutura em aberto.

---

## 20. Acessibilidade, celular e desempenho

### Modo lista (alternativa 2D)

Botão "Lista" na barra (tecla `L`) troca o canvas por [`ListView`](../src/hud/list/ListView.tsx): clientes,
chamados, projetos (com botão "Quadro"), faturas e prédios — e, dentro de um projeto, o Kanban em colunas.
Tudo é `<button>` nativo (Tab/Enter), com `aria-current` no item selecionado, e usa o **mesmo** inspector e os
mesmos formulários. Para mudar atividade de coluna: "Mover para a zona" no inspector. Sem WebGL, o modo lista é
forçado e um aviso explica o motivo.

### Teclado e leitores de tela

- Foco visível (`:focus-visible` com contorno da marca) só na navegação por teclado.
- Busca, painel do jogo (`role=tablist/tab/tabpanel`), drawer de formulário e tour são `role=dialog` rotulados.
- Barra de câmera é `role=toolbar`; toasts usam `aria-live`; chips de nível/saúde têm `aria-label` descritivo.
- O celular é `role=region` rotulado; a barra de tarefas e as abas da listagem são `role=tablist/tab`.
  Tudo nele é operado pelo teclado do computador — não existe teclado na tela.
- Contraste: o cinza de texto secundário (`--color-ink-3`) passou de `#94a3b8` (2,6:1) para `#64748b` (4,8:1).

### Movimento reduzido

Liga com `prefers-reduced-motion` do sistema **ou** "Reduzir animações" no menu do usuário. Efeitos:
câmera corta em vez de deslizar; sem pedestres, chegadas/partidas de veículos e carro-forte; sem chuva nem
relâmpagos, nuvens paradas; giroflex aceso fixo (sem piscar); caixas, empilhadeiras e caminhões vão direto à
posição; sem confete. O CSS também reduz as animações. Implementação: `scene/motion.ts` (lido nos `useFrame`) e `useReducedMotion()`.

### Celular (< 768px)

- Barra superior compacta (só ícones), sem KPIs, linha do tempo e celular — o aparelho só existe a
  partir de `lg` (≥ 1024px), onde há coluna lateral para ele (`useIsDesktop`). Os chamados continuam
  acessíveis pelo inspector e pelo modo lista.
- Os controles de câmera também só entram na barra a partir de `lg`; abaixo disso continuam na
  barrinha vertical flutuante (§10.2).
- **Inspector vira bottom sheet** (até 68% da altura, respeita a safe area).
- Sem seleção, uma **barra de ações** ao alcance do polegar: Buscar, Lista/Cidade 3D, Jogo — e, no pátio,
  Cidade e + Atividade (substituem os atalhos de teclado).
- Formulários ocupam a tela inteira; um dedo arrasta o mapa, dois dedos fazem zoom e giro.

### Tour de primeiro acesso

5 passos ([`Tour.tsx`](../src/hud/Tour.tsx)): boas-vindas, busca, câmera/construção/pátio, nível e missões,
saúde/clima. Destaca o elemento marcado com `data-tour` escurecendo o resto; sem alvo visível (ex.: celular) o
cartão fica centralizado. Setas navegam, `Esc` pula. "Já visto" fica por usuário em `mrcode-city:tour:<id>`;
dá para rever pelo menu do usuário.

### Orçamento de desempenho

Abra com `?perf` para ver fps, draw calls, triângulos, geometrias e texturas (`renderer.info`).

| Métrica | Orçamento | Medido (9 clientes, AO ligado) |
|---|---|---|
| Draw calls — cidade | ≤ 450 | 231 (183 com as placas desligadas) |
| Draw calls — pátio | ≤ 450 | 105 |
| Draw calls — agência do BC | ≤ 450 | 90 |
| Draw calls — biblioteca da UN | ≤ 450 | 78 |
| Triângulos | ≤ 250 mil | 168 mil (cidade) · 27 mil (pátio) |

Os cenários internos (§9.9–9.11) são baratos porque **tudo neles é instanciado por modelo**: a sala
inteira cabe em poucas dezenas de chamadas, e as ~100 lombadas da estante custam **uma**.

Cada cliente soma ~50 draw calls (sede, canteiros e caminhões, contando a sombra). Perto de 15 clientes,
instancie sedes e caminhões (`<Instances>`) antes de estourar o orçamento. Também ajudam: DPR adaptativo,
AO só com folga de fps e o modo de movimento reduzido.

As placas (§9.7) custam ~2 malhas cada, contadas duas vezes com o AO ligado (ele re-renderiza a cena).
Se apertar, os postes dão um `<Instances>` em `City()` — as âncoras já saem do layout (`world/signs.ts`),
então dá para hoistar sem refatorar o componente. O campo (§9.8) já é todo instanciado: ~210 plantas
custam 4 draw calls, então crescer o bosque sai quase de graça (o custo é em triângulos).
