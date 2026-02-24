# Client Change Implementation Plan

## 1) Goal
Implement all requested UX and behavior updates for Pricing and Subscriptions with minimal regression risk, while preserving existing data integrity and compatibility checks.

## 2) Client Requests (Normalized)
1. Pricing modal:
- Rename `Tiered Price` to `Metered Price`.
- For `Fixed Price`, `Product` must be an editable dropdown (pick existing or create new value).
- Rename `Pricing Name` to `Pricing Name (internal use)`.
- Rename `Product` to `Product (invoice line item name)`.

2. Subscriptions:
- Remove start/end date from subscription list.
- Remove start/end date from subscription dialog.
- Remove `Activate immediately`.
- Remove delete icon in subscription list row actions.
- Remove top-right Sales/Ops + notifications icons.
- Remove payment method from subscription dialog.

## 3) Key Dependencies and Design Decisions (Must Confirm Before Coding)
1. Default lifecycle behavior after removing dates:
- Option A: Always create/update with `startDate = today`, `endDate = null`.
- Option B: Keep backend date fields as-is for existing records, but hide from UI and only send defaults on create.
- Recommendation: Option A for consistency and predictable behavior.

2. Default status after removing `Activate immediately`:
- Option A: New subscriptions always `DRAFT`.
- Option B: New subscriptions always `ACTIVE`.
- Recommendation: Option A (safer operationally).

3. Editable `Product` in Pricing form:
- Option A: Add dedicated `POST /api/admin/products` and then create pricing with returned `productId`.
- Option B: Extend pricing create/update payload to accept `productName` and auto-create product server-side.
- Recommendation: Option A (cleaner API boundary, reusable endpoint).

4. Demo role control removal scope:
- Option A: Remove only visible role switcher + icons, keep role logic defaulting to current persisted role.
- Option B: Remove role gate behavior from UI flow and force one role in prototype.
- Recommendation: Option B only if product confirms no role-based demo behavior is needed.

## 4) Implementation Strategy
Use a dependency-first sequence: backend contracts first, then frontend form changes, then list/shell cleanups, then regression checks.

## 5) Step-by-Step Plan

### Phase 0: Baseline and Safety Net
1. Create branch for client-change batch.
2. Run baseline checks: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @stripe-integration/web build`.
3. Capture current behavior in a quick QA checklist (pricing create/edit, subscription create/edit/delete, bulk actions).

Definition of done:
- Clean baseline before functional changes.

---

### Phase 1: Backend support for editable Pricing Product
1. Add API endpoint to create product from UI-provided name (and code generation/normalization policy).
2. Ensure uniqueness strategy for product code to avoid collisions.
3. Return product payload compatible with existing `getProducts` consumer shape.
4. Add input schema validation for product creation.
5. Add tests for valid create, duplicate handling, validation errors.

Dependencies:
- Required before frontend editable dropdown can persist new product values.

Likely files:
- `apps/api/src/routes/admin-routes/products.ts`
- `apps/api/src/schemas/*` (new/extended product schema)
- `apps/web/src/api/types/products.ts`
- `apps/web/src/api/services.ts`
- `apps/web/src/api/hooks.ts` (mutation hook)

Definition of done:
- Frontend can create product via API and re-fetch options.

---

### Phase 2: Pricing modal terminology and field labeling
1. Rename UI labels:
- `Tiered price` -> `Metered price`.
- `Pricing name` -> `Pricing Name (internal use)`.
- `Product` -> `Product (invoice line item name)`.
2. Rename related helper text and section subtitles for consistency.
3. Keep internal enum/type values unchanged (`TIERED`) to avoid unnecessary backend/domain migration.

Dependencies:
- Independent from backend.

Likely files:
- `apps/web/src/features/pricings/components/PricingFormSections.tsx`
- `apps/web/src/features/pricings/components/PricingTreePricingRowParts.tsx`
- Any additional pricing labels in pricings tree/list components.

Definition of done:
- No visible `Tiered` wording in end-user pricing UI where client requested rename.

---

### Phase 3: Editable Product control in Pricing form (Fixed Price flow)
1. Replace strict select-only product field with editable autocomplete/combobox.
2. Support 2 actions in one control:
- Select existing product.
- Create new product if typed value not found.
3. On create:
- Call new product mutation.
- Refresh product options.
- Auto-select newly created product.
4. Keep validation strict: pricing cannot be saved without resolved `productId`.
5. Preserve current edit flow for existing pricings.

Dependencies:
- Phase 1 must be complete.

Likely files:
- `apps/web/src/features/pricings/components/PricingFormSections.tsx`
- `apps/web/src/features/pricings/pricingForm.types.ts`
- `apps/web/src/features/pricings/pricingForm.state.ts`
- `apps/web/src/features/pricings/pricingForm.actions.ts`
- `apps/web/src/features/pricings/pricingForm.hooks.ts`
- `apps/web/src/features/pricings/pricingForm.validation.ts`
- `apps/web/src/api/hooks.ts` and `services.ts`

Definition of done:
- Fixed pricing can be saved with newly typed product name through resolved product creation path.

---

### Phase 4: Subscription form simplification (dates, activate, payment method)
1. Remove dates section from dialog UI.
2. Remove `Activate subscription immediately` section.
3. Remove payment method section from dialog UI.
4. Adjust form state/actions to stop exposing these controls.
5. Keep payload compatibility by explicitly sending normalized values:
- `startDate`: computed default (per decision gate).
- `endDate`: `null`.
- `paymentMethodId`: `null`.
- `status`: chosen default.
6. Ensure availability-preview and transfer-eligibility payload builders remain valid with normalized values.

Dependencies:
- Requires decisions from Section 3.

Likely files:
- `apps/web/src/features/subscriptions/SubscriptionFormDrawer.tsx`
- `apps/web/src/features/subscriptions/components/SubscriptionFormSections.tsx`
- `apps/web/src/features/subscriptions/components/SubscriptionFormSections.payment-pricings.tsx`
- `apps/web/src/features/subscriptions/subscriptionForm.utils.ts`
- `apps/web/src/features/subscriptions/subscriptionForm.actions.ts`
- `apps/web/src/features/subscriptions/subscriptionForm.helpers.ts`
- `apps/web/src/features/subscriptions/subscriptionForm.hooks.ts`

Definition of done:
- Dialog has no date/payment/status-toggle controls and still saves valid subscriptions.

---

### Phase 5: Subscription list simplification
1. Remove `Start` and `End` columns from list header and rows.
2. Remove date sort fields and related sort logic.
3. Remove delete row icon from actions column.
4. Keep bulk delete capability unchanged unless client requests removal.

Dependencies:
- Independent, but should land after Phase 4 to avoid mixed UX.

Likely files:
- `apps/web/src/features/subscriptions/components/SubscriptionsTable.tsx`
- `apps/web/src/features/subscriptions/components/SubscriptionsTableRow.tsx`
- `apps/web/src/features/subscriptions/subscriptionsTab.utils.ts`

Definition of done:
- List no longer exposes date columns or single-row delete icon.

---

### Phase 6: Header cleanup (top-right controls)
1. Remove notifications icon.
2. Remove profile/person icon.
3. Remove Sales/Ops role switcher if confirmed.
4. If role switcher is removed, define fallback role behavior to prevent access surprises.

Dependencies:
- Decision from Section 3 about role behavior.

Likely files:
- `apps/web/src/components/AppShell.tsx`
- Potentially `apps/web/src/demoRole*` and consumers if role logic is fully removed.

Definition of done:
- Top-right area matches client request and app remains navigable.

---

### Phase 7: Regression hardening and QA
1. Automated checks:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm --filter @stripe-integration/web build`
- API tests for new products endpoint and adjusted flows.
2. Manual QA matrix:
- Create/edit fixed pricing with existing product.
- Create fixed pricing with new typed product.
- Create/edit metered pricing.
- Create/edit subscription after form simplification.
- Subscription list filtering/sorting after date-column removal.
- Pricing edit from subscriptions view.
- Bulk actions still valid.
3. Verify no stale transpiled JS artifacts in `apps/web/src` after changes.

Definition of done:
- All checks pass and key flows validated against client request list.

## 6) Risk Register and Mitigations
1. Risk: Hidden date removal breaks backend validation assumptions.
- Mitigation: Keep explicit normalized date payload; test create/update and availability preview endpoints.

2. Risk: Product creation introduces duplicate/invalid product naming.
- Mitigation: enforce schema validation and deterministic code normalization/collision handling.

3. Risk: Removing role UI but keeping role logic can lock features by persisted role.
- Mitigation: reset/fallback role strategy on app load when role switcher is removed.

4. Risk: Removing row delete icon may be perceived as missing delete capability.
- Mitigation: keep and communicate bulk delete path (or remove delete entirely if requested later).

## 7) Delivery Slices (Suggested PR Breakdown)
1. PR-1: Backend product create support + tests.
2. PR-2: Pricing modal labels + editable product control.
3. PR-3: Subscription form simplification (dates/status toggle/payment).
4. PR-4: Subscription table simplification + header icon cleanup.
5. PR-5: Final polish + regression fixes.

## 8) Acceptance Criteria
1. Client terminology changes are visible exactly as requested.
2. Fixed pricing supports selecting existing product and creating a new one inline.
3. Subscription dialog has no date fields, no activate toggle, no payment method selector.
4. Subscription table has no start/end columns and no row delete icon.
5. Top-right Sales/Ops + notification/profile icons are removed.
6. Existing core flows still pass typecheck/lint/build and smoke QA.
