# Pricing & Tiered Logic Requirements v1

Остання актуалізація: `2026-02-13`

## 1) Мета документа

Зафіксувати однозначні вимоги до:
- моделі `Pricing` (fixed/tiered),
- логіки tiered-розрахунку,
- джерела unit-кількостей (property/account),
- мінімально потрібних змін у БД, API і UX для коректного білінгу.

`PRD` залишається source of truth на рівні продукту; цей документ деталізує імплементаційні правила.

## 2) Терміни та канонічні поля

- `Fixed pricing`: статична сума (`fixedAmountCents`) за період або за одиницю (визначається продуктом/метрикою).
- `Tiered pricing`: ціна за unit залежить від діапазону загальної кількості units.
- `quantity` з PRD мапиться на `toUnit` в `pricing_tiers`.
- `open-ended tier`: `toUnit = null` (діапазон до нескінченності).
- `minimumPriceCents`: мінімальна сума для одного pricing line item за billing period.

Примітка по грошам для поточного прототипу:
- В БД/бекенді наразі використовуються поля в `*_cents`.
- У UX/API presentation шарі відображаємо значення в доларах.

## 3) Обов'язкові правила Tiered

### 3.1 Структура tier'ів

- Перший tier починається з `fromUnit = 1`.
- Tier'и мають бути contiguous: кожний наступний `fromUnit = previous.toUnit + 1`.
- Overlap і gap заборонені.
- Лише останній tier може бути open-ended (`toUnit = null`).
- Для `TIERED` має існувати мінімум 1 tier.

### 3.2 Режим розрахунку (зафіксувати для v1)

Для v1 використовуємо **VOLUME**-модель:
- Визначаємо один tier за total units.
- `unitAmountCents` береться з цього tier.
- Сума: `calculated = totalUnits * unitAmountCents`.
- Після цього застосовуємо minimum floor:
  - `final = max(calculated, minimumPriceCents ?? 0)`.

Примітка:
- `GRADUATED` модель (коли кожен tier рахується окремо) не входить у v1.

### 3.3 Визначення `totalUnits`

- `scope = ACCOUNT`: `totalUnits` = сума unit count всіх properties цього account.
- `scope = PROPERTY`: `totalUnits` = unit count конкретної property.
- Для tiered планів `totalUnits` фіксується на момент виписки інвойсу (5-го числа за попередній місяць).

## 4) Вимоги до джерела unit-даних

Поточна проблема: `properties` не має unit count, тому tiered billing не може бути коректним.

### 4.1 Мінімум для v1 (обов'язково)

Додати до `properties`:
- `billable_units Int NOT NULL DEFAULT 0`
- валідація: `billable_units >= 0`

Бізнес-правила:
- Це канонічне джерело units для прототипу.
- Агрегація на account виконується в runtime (`SUM(properties.billable_units)`).

### 4.2 Поточний scope

- Працюємо тільки з менеджментом `subscriptions` + `pricings`.
- Інвойси та snapshot-рівень виключені з поточного scope.

## 5) Вимоги до БД (дельта до поточного стану)

### 5.1 Property

- `properties.billable_units` (нове поле).

### 5.2 Pricing / Tiers

Поточна модель `pricing_tiers(fromUnit, toUnit, unitAmountCents)` валідна, але має бути підкріплена правилами:
- DB-level/Service-level перевірка contiguous/no-overlap.
- Обмеження: тільки один open-ended tier на pricing.

Рекомендовано:
- `pricings.tier_mode` enum з default `VOLUME`.
  - У v1 дозволене лише значення `VOLUME`.
  - Готує БД до майбутнього `GRADUATED` без міграції форми даних.

### 5.3 Subscription Pricing Link

`subscription_pricings.quantity` зараз не визначає tiered units.
Для v1:
- залишаємо `quantity` для fixed/manual quantity use-cases;
- для tiered `quantity` не бере участі у формулі, доки не з'явиться окрема вимога.

## 6) Вимоги до API

### 6.1 Property Units

Додати admin endpoints:
- `GET /api/admin/properties?accountId=...` повертає `billableUnits`.
- `PATCH /api/admin/properties/:id/units`
  - body: `{ billableUnits: number }`
  - валідація `>= 0`.

### 6.2 Pricing Validation

`POST/PATCH /api/admin/pricings`:
- enforce tier rules (див. секцію 3.1),
- enforce tier mode `VOLUME` (або implicit default),
- enforce `minimumPriceCents >= 0`.

## 7) Вимоги до UX

### 7.1 Pricing Form (Tiered)

Показувати явні правила:
- "Tier 1 must start at 1"
- "No gaps or overlaps"
- "Only last tier can be open-ended"
- "Minimum price applies per billing period"
- В UX вводимо `max units` для кожного tier; останній tier автоматично open-ended (`∞`).
- Для кожного tier `max` має бути не меншим за старт його діапазону.

### 7.2 Property Units

- На цьому етапі units задаються seed-даними.
- У UI показуємо `billableUnits`, але без edit-flow.

### 7.3 Subscription Details

Показувати розрахунковий контекст:
- scope (`ACCOUNT`/`PROPERTY`),
- units source,
- related units (`property.billableUnits` або account sum).

## 8) Acceptance Criteria (обов'язково)

1. Tiered pricing не створюється, якщо tier'и не contiguous або не стартують з 1.
2. Для account-scope subscription `totalUnits` = сума `billableUnits` по всіх properties account.
3. Для property-scope subscription `totalUnits` = `billableUnits` конкретної property.
4. При `minimumPriceCents` фінальна сума не нижча за minimum.
5. API повертає зрозумілі помилки валідації (із конкретним полем/правилом).

## 9) Тест-кейси (мінімальний набір)

1. `totalUnits = 0` при tiered: очікувана поведінка визначена і зафіксована (рекомендовано `final = minimumPriceCents ?? 0`).
2. Boundary case: `toUnit = 100`, `totalUnits = 100` потрапляє в цей tier.
3. Boundary case: `totalUnits = 101` потрапляє в наступний/open-ended tier.
4. Негативний кейс: gap між tier'ами (`1-50`, `52-100`) -> 400 validation error.
5. Негативний кейс: open-ended tier не останній -> 400 validation error.

## 10) Узгоджені рішення

1. `totalUnits = 0` дозволено; результат = `minimumPriceCents ?? 0`.
2. У сумі account units враховуємо всі properties (на цьому етапі всі активні).
3. Product-specific metric key переносимо на v2 (не входить у v1).

## 11) Рекомендований порядок імплементації

1. Додати `properties.billable_units` + seed/backfill.
2. Оновити property API (`GET` + `PATCH units`) і додати account-level `totalBillableUnits`.
3. Зафіксувати `VOLUME` формулу в service-layer + unit tests.
