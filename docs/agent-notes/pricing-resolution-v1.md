# Pricing Resolution Rules v1

Остання актуалізація: `2026-02-13`

## 1) Мета

Зафіксувати єдину бізнес-логіку, як застосовуються `pricings` до `account` та `property`, щоб:
- API дерева (`/api/admin/pricings-tree`) показував коректний effective стан;
- UX не вводив в оману по tier/rate;
- наступні етапи (preview/invoicing) могли спиратись на ті самі правила.

## 2) Scope v1

У scope:
- `ACCOUNT` vs `PROPERTY` subscriptions;
- merge/override по `productId`;
- tiered/fixed resolution для дерева pricing.

Поза scope:
- invoice snapshots;
- proration/date-versioning;
- historical recalculation.

## 3) Базові правила

1. `ACCOUNT` subscription застосовується до всіх properties акаунта.
2. `PROPERTY` subscription не замінює весь account subscription.
3. Override працює тільки по продукту: ключ конфлікту = `productId`.
4. Для конкретної property effective набір = `accountPricings + propertyPricings`, де `propertyPricings` мають пріоритет у конфліктах по `productId`.
5. `CANCELED` subscriptions виключаються з resolution.

## 4) Правила вибору джерела при дублях

Може існувати декілька subscriptions одного scope, що містять pricing для того самого `productId`.

В такому випадку winner обирається за пріоритетом:
1. `status`: `ACTIVE` > `PAUSED` > `DRAFT`;
2. при однаковому `status` — новіший `createdAt`.

Це правило застосовується окремо:
- для account-level candidates;
- для property-level candidates.

## 5) Effective pricing для property

Для кожної property:
1. Взяти account-level winner pricing по кожному `productId`.
2. Взяти property-level winner pricing по кожному `productId` (тільки для цієї property).
3. Змерджити набори:
   - якщо `productId` є тільки в account наборі -> `INHERITED`;
   - якщо `productId` є в property наборі -> `OVERRIDE` (account варіант цього ж продукту відкидається).

## 6) Tier/Fee resolution

### 6.1 Fixed pricing

- `unit tier` не рахується.
- Для відображення в дереві показується fixed amount цього pricing.

### 6.2 Tiered pricing (ключове правило)

#### A) Account-level (`INHERITED`)

Tier для account pricing визначається по `accountUnitPool`, а не по units кожної property:

`accountUnitPool(productId) = SUM(billableUnits всіх properties акаунта, де немає property override для цього productId)`

Потім:
- знаходимо tier за `accountUnitPool`;
- той самий tier/rate відображається для всіх `INHERITED` properties цього продукту.

#### B) Property-level (`OVERRIDE`)

Tier визначається локально:

`propertyUnits = property.billableUnits`

Потім:
- знаходимо tier за `propertyUnits`;
- застосовуємо його тільки для цієї property.

## 7) Важливий наслідок для UI дерева

Якщо продукт успадкований (`INHERITED`):
- property рядок має показувати той самий tier/rate, що account рядок для цього продукту.

Якщо продукт override (`OVERRIDE`):
- property рядок може мати інший tier/rate, бо рахується локально.

## 8) Канонічний приклад (A/B)

Account subscription (A):
- `Unit Subscription (Pro) (A)`
- `Late fee (A)`
- `Billing Automation (Pro) (A)`

Property subscription (B) для однієї будівлі:
- `Billing Automation Plus (Appfolio) (B)`
- `Unit Subscription (Pro) (B)`

Effective набір для цієї property:
- `Late fee (A)` (inherited)
- `Billing Automation (Pro) (A)` (inherited)
- `Billing Automation Plus (Appfolio) (B)` (override/add)
- `Unit Subscription (Pro) (B)` (override)

`Unit Subscription (Pro) (A)` для цієї property не застосовується.

## 9) API контракт для `/api/admin/pricings-tree` (v1)

Для кожного pricing у відповіді потрібні дані, достатні для прозорого UI:

- account row:
  - `source: ACCOUNT | PROPERTY_ONLY`
  - `totalBillableUnits`
  - `currentTier`
  - `currentUnitAmountCents`
  - `tierScope: ACCOUNT_POOL | PROPERTY` (нове)

- property row:
  - `source: INHERITED | OVERRIDE`
  - `property.billableUnits`
  - `currentTier`
  - `currentUnitAmountCents`
  - `tierScope: ACCOUNT_POOL | PROPERTY` (нове)
  - `resolvedBySubscriptionId` (нове)
  - `excludedFromAccountPool` (нове; true для override цього productId)

## 10) Implementation Plan (кроки)

### Sprint A: Canonical resolver

1. Створити service `apps/api/src/services/pricing-resolution.ts`.
2. Винести в нього:
   - фільтрацію subscriptions (`!= CANCELED`);
   - winner selection за `status + createdAt`;
   - merge account/property по `productId`;
   - обчислення `accountUnitPool(productId)` з виключенням override properties;
   - tier resolution для `INHERITED` vs `OVERRIDE`.
3. Повернути нормалізовану структуру resolver-а для tree endpoint.

### Sprint B: API інтеграція

1. Перепідключити `GET /api/admin/pricings-tree` на новий resolver.
2. Додати нові поля контракту (`tierScope`, `resolvedBySubscriptionId`, `excludedFromAccountPool`).
3. Оновити web API типи (`apps/web/src/api/types.ts`).

### Sprint C: Validation hardening

1. На create/update subscription заборонити дубль `productId` в межах одного subscription.
2. Повертати явну 400-помилку: яке правило порушено.

### Sprint D: UI alignment

1. В `PricingsTab` показувати `tierScope` і правильний source behavior.
2. Для `INHERITED` рядків гарантувати однаковий tier/rate з account row.
3. Для `OVERRIDE` рядків показувати локальний tier/rate.

### Sprint E: Tests

1. Unit тести resolver-а:
   - inherited tier спускається з account pool;
   - override по `productId` працює точково;
   - account pool виключає override properties;
   - multiple subscriptions winner selection;
   - fixed + tiered mixed cases.
2. API тести `/api/admin/pricings-tree`.

## 11) Test Matrix (мінімум)

1. Account tiered, без override: account units=23, tier2 -> усі inherited properties показують tier2 rate.
2. Одна property override того ж продукту: override property показує власний tier, решта properties лишаються inherited.
3. Override іншого продукту: базовий продукт не змінюється.
4. Два account subscriptions з однаковим продуктом: winner за `ACTIVE > PAUSED > DRAFT`, далі `createdAt`.
5. Account pricing існує тільки для частини продуктів, property додає ще один: effective набір = union з override-правилом.
6. Всі кандидати `CANCELED`: продукт не повинен потрапляти в effective output.

## 12) Відкриті питання (для v2)

1. Чи потрібна дата-ефективність (`effectiveFrom/effectiveTo`) замість "latest winner".
2. Чи потрібен graduated tier mode.
3. Чи зберігати resolution snapshot на момент інвойсингу.
