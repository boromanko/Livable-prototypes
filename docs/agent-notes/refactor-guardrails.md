# Refactor Guardrails (v1)

Орієнтир: зменшити когнітивне навантаження, уникати великих "god files", робити зміни дрібними PR-етапами.

## 1) Ліміти розміру файлів

- `UI container` (pages/tabs/screens): ціль `200-350`, hard cap `450`
- `UI presentational component`: ціль `80-220`, hard cap `300`
- `hooks/services/utils`: ціль `60-200`, hard cap `250`
- `API route module`: ціль `120-300`, hard cap `400`
- Винятки: `schema`, `seed`, `migrations`, generated files

Якщо файл перевищив hard cap:
- не додаємо нову логіку в цей файл
- виносимо частину в окремий модуль у цьому ж PR

## 2) Правила декомпозиції

- Один файл = одна головна відповідальність
- UI + бізнес-обчислення не змішувати в одному великому компоненті
- Повторювані format/error helper-и виносити в shared `lib`
- Доменні інваріанти (правила валідності) тримати в одному місці і використовувати всюди

## 3) PR-стратегія

- Маленькі послідовні PR (без "великих вибухів")
- Кожен PR має один головний фокус (наприклад: only backend invariants)
- Рефакторинг без зміни поведінки: окремо від feature-розробки

## 4) Definition of Done для кожного PR

- `pnpm typecheck` зелений
- `pnpm lint` зелений
- релевантні тести зелені (мінімум `pnpm --filter @stripe-integration/api test`)
- немає нових дублювань для helpers, які вже винесені в shared

## 5) CI baseline (обов'язковий порядок)

- Node: `22.x` (відповідно до `.nvmrc` і `engines`)
- Порядок кроків:
  1. `pnpm install --frozen-lockfile`
  2. `pnpm db:generate`
  3. `pnpm typecheck`
  4. `pnpm lint`
  5. `pnpm --filter @stripe-integration/api test`
- Якщо `db:generate` не проходить, PR не мерджимо (це blocker для workspace стабільності)
