# Agent Notes Index

Остання актуалізація: `2026-02-13`

## Документи

- `prd.md`
  - Основний PRD для Stripe Integration V2.1.
  - Важливо: цей файл вважається frozen для поточного етапу.

- `pricing-tier-requirements-v1.md`
  - Детальні імплементаційні вимоги по Pricing/Tiered logic.
  - Містить однозначну формулу розрахунку (`VOLUME`), DB/API/UX вимоги та acceptance criteria.

- `pricing-resolution-v1.md`
  - Канонічні правила резолюції `ACCOUNT` vs `PROPERTY` pricing.
  - Містить merge/override логіку по `productId`, правила tier resolution та покроковий план реалізації.

- `ui-structure-&-prototype-plans.md`
  - UX canvas, структура екранів і поточний статус UI-реалізації.
  - Містить backlog для покрокового UX polishing.

- `prototype-requirements-checklist.md`
  - Головний статусний checklist для прототипу.
  - Тут фіксується прогрес по UI/API і відкладені пункти.

## Поточний фокус

- Поступове UX polishing існуючих `Subscriptions` і `Pricings`.
- `Bills` лишається поза scope.
