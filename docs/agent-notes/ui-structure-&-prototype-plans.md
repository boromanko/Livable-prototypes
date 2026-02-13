# UI Structure — Stripe Integration V2.1

# Stripe Integration V2.1 — UX Requirements Canvas

## 0) План на прототип (vibe-coding)

Ціль: швидко продумати UX через робочий прототип перед “чистовим” дизайном у Figma.

Підхід (локально):

* Monorepo, **TypeScript всюди**.
* Frontend: React + MUI.
* Мінімальний backend + DB для реалістичних сценаріїв.
* Seed дані: ~10 Accounts, у кожного ~10 Properties.
* Порожні таблиці для створення/редагування через UI: Pricings, Subscriptions (згідно вимог нижче).
* Фокус прототипу: таблиці/фільтри/bulk actions, create/edit flows, ролі/права доступу.

## 1) Ролі та межі доступу (впливає на UX)

Ops

* Повний контроль над Pricings (створення/редагування/видалення).

Sales

* Бачить Pricings, але не редагує.
* Створює/керує Subscriptions (разом з Ops).

Account/Customer (property managers)

* Бачать Subscriptions і ціни.
* Не бачать internal pricing name (внутрішня назва для Ops/Sales).

## 2) Глобальна навігація та основні розділи

A) Admin area (Ops/Sales): Billing / Products & Pricing (новий розділ)

* New section з 2 табами: Subscriptions + Pricings.

Tab 1 — Subscriptions (table)

* UI: таблиця + фільтри по колонках + bulk actions.
* Must-have колонки:

  * Account
  * Property (nullable для account-level)
  * Start date
  * End date (nullable / Forever)
  * Pricings list (кожен pricing з нового рядка)
* Bulk actions:

  * Delete subscription
  * Add / Replace / Delete pricing (для selected subscriptions)
* Drill-down:

  * Row click → Subscription details (edit: scope, dates, pricings, payment method, discount/coupon якщо є)
* Notes:

  * Scope = Account або Property
  * Billing cadence: invoice/charge 5-го за попередній місяць

Tab 2 — Pricings (tree)

* UI: tree by product + node для fixed-price варіантів.
* На pricing item:

  * Pricing name (internal)
  * “# subscriptions using it”
* Actions:

  * Ops: add/edit/delete
  * Sales: view only

B) Account area: Subscriptions visibility (2 entry points)

* Property details page → Subscription section (показати subscription для property)
* Account left-nav tab → “Subscriptions” table (підписки на рівні акаунта)

Що бачить Account в subscription:

* Start/end dates
* Property (якщо assigned)
* Prices; для tiered — показати всі рівні tier’ів
* Не показувати internal pricing name

C) Payment Methods (Account)

* Account-level: list + add/remove + default.
* UI/flow:

  * List (masked, напр. “VISA 1234”)
  * Set default
  * Remove guardrails: не можна видалити, якщо attached to subscription або upcoming bill
  * Add: SetupIntent + Stripe Elements (React), tabs layout, support card + us_bank_account

## 3) Ключові UX-правила

Subscription billing cadence

* Invoice/charge: 5-го числа за попередній місяць
* No prorate: навіть якщо онбординг 15-го — платять за весь місяць

Account-level vs Property-level

* Subscription attached to Account OR Property
* Payment method selection:

  * Якщо subscription має свій PM → використовувати його
  * Інакше → property PM (якщо є) або account default

Invoicing model

* Invoice створюється per subscription
* Якщо треба invoice по property → робити окремі subscriptions

## 4) Мінімальний набір екранів/вʼюшок (Design Checklist)

Ops/Sales

* Products & Pricing (container) → Tabs: Subscriptions / Pricings
* Subscriptions tab: table + filters + bulk actions
* Create Subscription flow (modal/page)
* Subscription details (edit)
* Pricings tab: tree by product
* Pricing details (Ops editable; Sales read-only)

Account (Customer)

* Account → Subscriptions (left-nav): table (read-only; без internal pricing name)
* Property details → Subscription section (read-only + link)
* Account → Payment Methods: list/add/remove/default + SetupIntent flow

## 5) Відкрите з PRD: де живе Bills UI

PRD описує Bills як сутність, але UI placement не визначено (в UI секції тільки 2 таби).
Варіанти рішення:

* (A) 3-й таб “Bills” у Products & Pricing
* (B) Bills у контексті Account/Property (CTA “Create bill”) як окремі вʼюшки
