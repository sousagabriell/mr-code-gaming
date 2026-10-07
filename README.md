# MrCode City

Painel operacional **gamificado** do MrCodeAdmin: clientes, projetos, chamados, financeiro e Kanban como uma
cidade 3D navegável — onde também se opera (criar, editar, arrastar caixas entre zonas).

![stack](https://img.shields.io/badge/React_19-Three.js_·_R3F-134ced) ![tests](https://img.shields.io/badge/testes-38_unit_·_6_e2e-22c55e)

## Rodando

```bash
# 1. Backend (repositório mr-code-admin) em http://localhost:5200 — ver docs/MANUAL-TECNICO.md §3
# 2. Front
npm install
npm run dev            # http://localhost:5173 (proxy /api → :5200)
```

| Comando | |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção (`VITE_BASE=/city/` para servir em subcaminho) |
| `npm test` | Testes unitários (vitest) |
| `npm run e2e` | Testes E2E (Playwright; exige backend e `E2E_EMAIL`/`E2E_PASSWORD`) |
| `npm run lint` | oxlint |

Abra com `?perf` para ver fps, draw calls e triângulos da cena.

## Documentação

- **[Manual técnico](docs/MANUAL-TECNICO.md)** — arquitetura, funcionalidades, API, gamificação, testes, deploy
- **[Plano de evolução](docs/PLANO-EVOLUCAO.md)** — roadmap e status por fase
