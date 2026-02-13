# PRD — Stripe Integration V2.1

## Overview
This document defines the requirements for Livable’s enhanced integration with Stripe to support both **tiered** and **fixed** pricing models. The integration will support **account-wide** or **property-local** pricing, while preserving compatibility with **legacy fixed pricing schedules**. Plans and products are defined in **Livable**. Stripe is used for **invoice generation** and **payment processing**.

## TL;DR
Move most pricing/product/subscription support into **Livable Pro** and remove split responsibilities between Livable backend and Stripe. Add new UI to define products + tiered/fixed cost; use Stripe primarily for payment processing (and invoices).

## Objectives
- Introduce **tiered pricing** while retaining support for fixed pricing.
- Allow **Ops** to define fixed and tiered products.
- Allow **Ops (and Sales)** to set up **Subscriptions** (recurring) and **Bills** (one-off) for defined products.
- Support product and payment method configuration both **account-wide** and **property-level**.
- Credit card charges will be absorbed by Livable (customer sees same pricing for CC and ACH).
- Support **versioned pricing** via flexible product support.

## Definitions
- **Product** — a service offered by Livable.
- **Price / Pricing** — product with tiered or fixed pricing.
- **Tiered Price** — volume-based pricing that adjusts unit cost by total active/billable units across an account.
- **Fixed Price** — static rate applied per unit or per account.

## Livable Products
Livable products are predefined by engineering as they are dynamically adjusted based on use. Products without “units” can be added using fixed pricing support.

### Pro (RUBS without integrations)
- Unit Subscription (Pro)
- Billing Automation (Pro)
- Billing Automation Plus (Pro)

### Appfolio (Integrated PMS)
- Unit Subscription (Appfolio)
- Billing Automation (Appfolio)
- Billing Automation Plus (Appfolio)
- AP Automation (Appfolio)

### CIB (Cable & Internet Billing)
- Unit Subscription (CIB)

### Other examples
- Late fee
- etc…

## Pricing Definition
Pricing can be a **fixed price** product or a **tiered price** product.

When defining a new pricing:
- Ops selects whether it is **Fixed** or **Tiered**.
- For tiered products, Ops defines **tiers** and the **unit price** per tier.
- Tiered configuration should also be used for unit-based pricing even if no tiers are required (e.g., Paper Statements).

### Supported unit-based products (defined by engineering)
- Billable Units
- Paper Invites
- Paper Statements
- Convenience Fee
- NSF Fee
- Vacant Unit Monitoring

### Tier design rules
- `quantity` defines the upper limit for the unit price.
- Empty `quantity` defines the unit price above the highest quantity (e.g., 101–∞).
- For tiered pricing, a **minimum price** may be set.

## Subscriptions
A subscription is a **recurring payment**.

### Subscription fields
- **Scope:** Account OR Property (to allow different payment method per property)
- **Starting month:** we always process subscriptions on the **5th** for the **prior month** of service
- **Date range:** start date and optionally end date (or **Forever**)
- **One or more pricings** (which also defines products)
- **Discount** (optional)
- **Coupon** (optional)
- **Payment Method** (optional)
  - If none selected → use payment method assigned to property or fallback to default payment method for account

### Subscription behavior
- Generates an **invoice monthly**.
- For tiered plans, charges based on the number of units assigned to the account/property **on invoice issuance date**.
- Charges only for months we provide service.
  - If onboarded on the 2nd → first bill/payment happens on the 5th of the **following month**.
- **No proration**: onboarding on the 15th still charges for the entire month.

## Bills
A bill is a **single-occurrence payment**.

### Bill fields
- **Scope:** Account OR Property it is attached to
- **Due date** (optional)
- **One or more fixed-cost products**
- **Discount** (optional)
- **Coupon** (optional)
- **Payment Method** (optional; uses default if none selected)

### Bill behavior
- Generates an **invoice on the due date** and processes a payment (if payment method is available).
- If payment method is not available → sends an email to the account to set up a payment method (**SetupIntent**).

## Payment Method
- An account/customer will have a **default payment method**.
- An account/customer can assign an alternative payment method **per subscription** (account or property level).

### Payment method configuration (Account-level)
- List available payment methods (limited details, e.g., “VISA 1234”)
- Add or remove a payment method
  - Removing allowed only if not attached to a subscription or upcoming bill
  - If removal blocked → show message explaining why
- Select default payment method

### Recommendation (implementation note)
Prefer **SetupIntent + Stripe Elements for React** in a tabs layout. Accept:
- `card`
- `us_bank_account`

(Also configurable at Livable Stripe configuration level so Ops can change as needed.)

## Workflow
Designated workflow for defining products, pricing, subscriptions, etc.:
1. Engineering defines products (tied to code for unit calculations)
2. Ops defines pricings (one or more per product; can define fixed-price pricings for non-unit products)
3. Sales/Ops creates subscriptions for accounts and/or properties (subscription defines one or more pricings charged monthly)
4. Defaults: Ops defines a default subscription (with pricings) for new accounts (e.g., onboarding new account from AppFolio)
5. Accounts can see subscriptions:
   - show product + price
   - **do not show pricing name** (Ops/Sales only)
6. Accounts can update payment method assigned to account, property, and subscription
7. Backend creates and charges invoices monthly based on subscriptions created in the system
8. Invoice is created **per subscription**:
   - if account needs invoice per property → each property should have its own subscription

## User Interface
A UI will be added for Ops/Sales use and for Accounts (property managers).

### For Ops and Sales
New section of the UI for product, pricing and subscription management with two tabs:

#### Tab: Subscriptions
- Table showing all subscriptions
- Allows adding new subscriptions
- Each row represents a subscription
- Filterable by each column
- Supports bulk updates for selected rows:
  - delete subscription
  - add/replace/delete pricing for a subscription

**Columns:**
- Account
- Property (may be empty if account-level subscription)
- Start date
- End date (may be empty or Forever)
- Pricings (list of pricings included; new line per pricing item)

#### Tab: Pricings
- Tree structure with all pricings (fixed and tiered)
- Tree structure by product + tree node to contain all fixed price pricings
- Allows adding/editing/deleting pricings
- Each item includes:
  - pricing name
  - number of subscriptions that include it
- Pricings editable only by **Ops**
- Sales can only view

### For Accounts, Sales and Ops
Subscriptions viewable in two places:
- Property details page shows the subscription
- New left-nav tab with subscriptions table for the account

Accounts can see:
- Subscription start/end dates
- Property (if assigned)
- Prices (for tiered prices: all tier levels)

Accounts will NOT see:
- Pricing name (Ops/Sales only)

## Caveats and Considerations
- Payment is processed by issuing a **Stripe Invoice** (downloadable).
  - Future: may support Livable invoices and use PaymentIntent.

**Pros:** Stripe-managed, automatic retries, easy to view in Stripe, can be sent for payment via Stripe  
**Cons:** extra fees (0.4%)

- Subscriptions limited to be charged on days **1–28** of the month to reduce complexity of shorter months.
  - Given we plan to charge on the 5th, this is not a limitation.
- Refunds will be done in Stripe UI.

## Future Plans (not part of current implementation)

### Coupon (Account and Property Level)
Defined by Ops and includes:
- Coupon name
- Coupon code
- Coupon expiration date (optional)
- Coupon duration in days (optional, e.g., 90-day trial)
- Fixed discount OR % discount
- Coupon allowed at account level OR property level

Rules:
- Coupons can be applied by ops, sales or customers/accounts.
- One or more coupons may be applied per account/property.

### Discount
Applied by Ops or Sales at account or property level (not by account/customer). Includes:
- Discount name/description
- Fixed discount OR % discount
- Expiration date (optional)

Note:
- Ops may define products with multiple pricing tiers (e.g., “full price” or “15% off”) to avoid issuing a separate discount.

### Ops, Sales and Account/Customer view
A customer can:
- View products applied to the account/property
- Add/remove/view coupons applied to the account
- View discounts applied to the account
- View and download invoices
- View (limited details) and update payment method