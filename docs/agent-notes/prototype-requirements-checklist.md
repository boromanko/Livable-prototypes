# Prototype Requirements Checklist — Stripe Integration V2.1

## Правила цього документу
- `[ ]` не зроблено
- `[~]` в роботі / частково
- `[x]` готово
- Фокус: тільки прототип UX
- `Bills`: поза scope на поточному етапі
- Поточна дата актуалізації: `2026-02-13`

## 1) Scope прототипу
- [x] Підтвердити межі прототипу (що точно входить/не входить)
- [x] Зафіксувати, що production-бізнес-логіку не реалізуємо
- [x] Зафіксувати, що `Bills` тимчасово ігноруємо

## 2) Ролі та доступи
Примітка: зараз система працює в single-role режимі (найвищий доступ), без реального role-based UI/permissions.

- [x] Ops: повний доступ до Pricings (create/edit/delete)
- [ ] Sales: лише перегляд Pricings
- [ ] Sales: керування Subscriptions
- [ ] Account/Customer: перегляд Subscriptions і цін
- [ ] Account/Customer: приховати internal pricing name

## 3) Інформаційна архітектура (IA)
- [x] Admin area: секція `Products & Pricing`
- [x] Admin area: 2 таби `Subscriptions` і `Pricings`
- [ ] Account area: окрема сторінка/таб `Subscriptions`
- [ ] Property details: блок `Subscription`

## 4) Subscriptions Tab (Ops/Sales)
- [x] Таблиця subscriptions
- [x] Колонка: Account
- [x] Колонка: Property (nullable)
- [x] Колонка: Start date
- [x] Колонка: End date (nullable/Forever)
- [x] Колонка: Pricings list
- [x] Фільтри по колонках
- [x] Bulk action: delete subscription
- [x] Bulk action: add pricing
- [x] Bulk action: replace pricing
- [x] Bulk action: delete pricing
- [x] Row click -> Subscription details/edit

## 5) Subscription Create/Edit Flow
- [x] Scope: Account або Property
- [x] Start date / End date / Forever
- [x] Додавання одного або кількох pricings
- [x] Вибір payment method (optional)
- [~] Правило fallback payment method
- [x] Базова валідація форми і повідомлення про помилки

## 6) Pricings Tab (Ops/Sales)
- [x] Tree by Product
- [x] Гілки fixed/tiered pricings
- [x] Відображати pricing name (internal)
- [x] Відображати `# subscriptions using it`
- [x] Ops може create/edit/delete pricing
- [ ] Sales має read-only доступ

## 7) Tiered/Fixed Pricing у прототипі
- [x] Fixed pricing: мінімально потрібні поля
- [x] Tiered pricing: додавання tier-рівнів
- [x] Tiered rule: останній tier може бути open-ended
- [x] Відображення tier-структури в UI
- [x] Tier editor: вводимо `max units` для кожного tier; останній tier має `∞`
- [x] Валідація на submit: `max` кожного tier не може бути меншим за старт діапазону
- [x] Inputs суми в UI вводяться в доларах (конвертація в cents на submit)
- [x] Numeric inputs дозволяють тимчасово порожнє значення без автопідстановки `0`

## 8) Account/Customer Views
- [ ] Account subscriptions table (read-only)
- [ ] Property subscription section (read-only)
- [ ] Показати start/end dates
- [ ] Показати property (коли є)
- [ ] Для tiered: показати всі рівні tier-ів
- [ ] Не показувати internal pricing name

## 9) Payment Methods (прототипний мінімум)
- [~] Список payment methods (masked)
- [ ] Set default method
- [ ] Add payment method (prototype flow)
- [ ] Remove payment method (з guardrails-повідомленням)

## 10) Небізнесові критерії прототипу
- [x] Seed-дані для демонстрації сценаріїв
- [x] Базові loading/error/empty стани
- [~] Послідовна термінологія в UI
- [x] Ручний smoke-check ключових флоу

## 11) Чекліст узгодження перед імплементацією
- [x] Узгоджені обовʼязкові поля у всіх формах
- [x] Узгоджені table actions і bulk actions
- [ ] Узгоджені права доступу по ролях
- [x] Узгоджені out-of-scope пункти

## 12) Узгоджений Backend Scope v1 (для прототипу UX)
- [x] Stack: Fastify + SQLite + Prisma
- [x] Без Stripe-інтеграції на цьому етапі (тільки локальний прототип)
- [x] Без production auth/permissions/audit
- [x] `Bills` поза scope
- [x] Працюємо як одна найвища роль (без role-based обмежень у v1)

### 12.1 Дані та моделі
- [x] `accounts`: `id`, `company_name`, `email`, `created_at`
- [x] `properties`: `id`, `account_id`, `name`, `address`, `created_at`
- [x] Звʼязок: `account 1 -> many properties`
- [x] `products`: каталог продуктів з PRD
- [x] `pricings`: багато прайсінгів до одного продукту
- [x] Типи прайсінгу: `FIXED` і `TIERED`
- [x] Для tiered використовуємо окрему таблицю `pricing_tiers` (не JSON)
- [x] `subscriptions`: account-level або property-level
- [x] `subscription_pricings`: many-to-many звʼязка subscription <-> pricing
- [x] `payment_methods`: мінімальна демо-модель для UX flow

### 12.2 Seed дані
- [x] 10 вигаданих компаній
- [x] Реалістичні email для кожної компанії
- [x] 10 properties на кожну компанію
- [x] Вигадані адреси properties
- [x] Стабільні ID у seed для наочних демо-сценаріїв

### 12.3 Базові правила
- [x] Subscription має scope: `ACCOUNT` або `PROPERTY`
- [x] Якщо scope=`ACCOUNT` -> `property_id = null`
- [x] Якщо scope=`PROPERTY` -> `property_id` обовʼязковий
- [x] У subscription можна додавати кілька pricings

### 12.4 API v1 для прототипу
- [x] `GET /api/admin/accounts` (пошук по company name + email)
- [x] `GET /api/admin/properties?accountId=...`
- [x] `GET /api/admin/products`
- [x] `GET /api/admin/payment-methods?accountId=...`
- [x] `GET /api/admin/pricings`
- [x] `POST /api/admin/pricings`
- [x] `PATCH /api/admin/pricings/:id`
- [x] `DELETE /api/admin/pricings/:id`
- [x] `GET /api/admin/subscriptions`
- [x] `POST /api/admin/subscriptions`
- [x] `PATCH /api/admin/subscriptions/:id`
- [x] `POST /api/admin/subscriptions/bulk` (delete/add pricing/replace/delete pricing)

## 13) Pricing/Tiered Logic Hardening (next)
Reference: `docs/agent-notes/pricing-tier-requirements-v1.md`

- [x] Зафіксувати окремий детальний requirements-документ по Pricing/Tiers
- [x] Додати `billable_units` у `properties`
- [x] Оновити seed/backfill для `billable_units`
- [x] Віддати `billableUnits` у `GET /api/admin/properties`
- [x] Додати endpoint редагування units на property-рівні (API only, без UI edit-flow)
- [x] Додати `totalBillableUnits` у `GET /api/admin/accounts`
- [x] Зафіксувати та імплементувати tier mode `VOLUME` для v1
- [x] Показати `billableUnits` у subscription UI flow (filters/rows/form selects)
