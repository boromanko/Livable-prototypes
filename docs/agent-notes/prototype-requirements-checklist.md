# Prototype Requirements Checklist — Stripe Integration V2.1

## Правила цього документу
- `[ ]` не зроблено
- `[~]` в роботі
- `[x]` готово
- Фокус: тільки прототип UX
- `Bills`: поза scope на поточному етапі

## 1) Scope прототипу
- [ ] Підтвердити межі прототипу (що точно входить/не входить)
- [ ] Зафіксувати, що production-бізнес-логіку не реалізуємо
- [ ] Зафіксувати, що `Bills` тимчасово ігноруємо

## 2) Ролі та доступи
- [ ] Ops: повний доступ до Pricings (create/edit/delete)
- [ ] Sales: лише перегляд Pricings
- [ ] Sales: керування Subscriptions
- [ ] Account/Customer: перегляд Subscriptions і цін
- [ ] Account/Customer: приховати internal pricing name

## 3) Інформаційна архітектура (IA)
- [ ] Admin area: секція `Products & Pricing`
- [ ] Admin area: 2 таби `Subscriptions` і `Pricings`
- [ ] Account area: окрема сторінка/таб `Subscriptions`
- [ ] Property details: блок `Subscription`

## 4) Subscriptions Tab (Ops/Sales)
- [ ] Таблиця subscriptions
- [ ] Колонка: Account
- [ ] Колонка: Property (nullable)
- [ ] Колонка: Start date
- [ ] Колонка: End date (nullable/Forever)
- [ ] Колонка: Pricings list
- [ ] Фільтри по колонках
- [ ] Bulk action: delete subscription
- [ ] Bulk action: add pricing
- [ ] Bulk action: replace pricing
- [ ] Bulk action: delete pricing
- [ ] Row click -> Subscription details/edit

## 5) Subscription Create/Edit Flow
- [ ] Scope: Account або Property
- [ ] Start date / End date / Forever
- [ ] Додавання одного або кількох pricings
- [ ] Вибір payment method (optional)
- [ ] Правило fallback payment method
- [ ] Базова валідація форми і повідомлення про помилки

## 6) Pricings Tab (Ops/Sales)
- [ ] Tree by Product
- [ ] Гілки fixed/tiered pricings
- [ ] Відображати pricing name (internal)
- [ ] Відображати `# subscriptions using it`
- [ ] Ops може create/edit/delete pricing
- [ ] Sales має read-only доступ

## 7) Tiered/Fixed Pricing у прототипі
- [ ] Fixed pricing: мінімально потрібні поля
- [ ] Tiered pricing: додавання tier-рівнів
- [ ] Tiered rule: останній tier може бути open-ended
- [ ] Відображення tier-структури в UI

## 8) Account/Customer Views
- [ ] Account subscriptions table (read-only)
- [ ] Property subscription section (read-only)
- [ ] Показати start/end dates
- [ ] Показати property (коли є)
- [ ] Для tiered: показати всі рівні tier-ів
- [ ] Не показувати internal pricing name

## 9) Payment Methods (прототипний мінімум)
- [ ] Список payment methods (masked)
- [ ] Set default method
- [ ] Add payment method (prototype flow)
- [ ] Remove payment method (з guardrails-повідомленням)

## 10) Небізнесові критерії прототипу
- [x] Seed-дані для демонстрації сценаріїв
- [ ] Базові loading/error/empty стани
- [ ] Послідовна термінологія в UI
- [x] Ручний smoke-check ключових флоу

## 11) Чекліст узгодження перед імплементацією
- [ ] Узгоджені обовʼязкові поля у всіх формах
- [ ] Узгоджені table actions і bulk actions
- [ ] Узгоджені права доступу по ролях
- [ ] Узгоджені out-of-scope пункти

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
- [x] `GET /api/admin/pricings`
- [x] `POST /api/admin/pricings`
- [x] `PATCH /api/admin/pricings/:id`
- [x] `DELETE /api/admin/pricings/:id`
- [x] `GET /api/admin/subscriptions`
- [x] `POST /api/admin/subscriptions`
- [x] `PATCH /api/admin/subscriptions/:id`
- [x] `POST /api/admin/subscriptions/bulk` (delete/add pricing/replace/delete pricing)
