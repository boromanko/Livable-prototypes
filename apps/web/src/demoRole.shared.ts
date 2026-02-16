export const ROLE_STORAGE_KEY = 'livable.demoRole';
export const ROLE_QUERY_PARAM = 'role';

export const ROLE_VALUES = ['OPS', 'SALES'] as const;

export type DemoRole = (typeof ROLE_VALUES)[number];

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  OPS: 'Ops',
  SALES: 'Sales'
};

export function canViewPricings(role: DemoRole): boolean {
  return role === 'OPS' || role === 'SALES';
}

export function canManagePricings(role: DemoRole): boolean {
  return role === 'OPS';
}

export function canManageSubscriptions(role: DemoRole): boolean {
  return role === 'OPS' || role === 'SALES';
}

export function normalizeRole(value: string): DemoRole | null {
  const normalized = value.trim().toUpperCase() as DemoRole;
  return ROLE_VALUES.includes(normalized) ? normalized : null;
}

export function normalizeRoleFromQuery(search: string): DemoRole | null {
  const params = new URLSearchParams(search);
  const roleValue = params.get(ROLE_QUERY_PARAM);
  return roleValue ? normalizeRole(roleValue) : null;
}
