import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const ROLE_STORAGE_KEY = 'livable.demoRole';
const ROLE_QUERY_PARAM = 'role';

const ROLE_VALUES = ['OPS', 'SALES'] as const;

export type DemoRole = (typeof ROLE_VALUES)[number];

type DemoRoleContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children }: { children: ReactNode }): JSX.Element {
  const [role, setRole] = useState<DemoRole>(getInitialRole);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ROLE_STORAGE_KEY, role);

    const url = new URL(window.location.href);
    url.searchParams.set(ROLE_QUERY_PARAM, role.toLowerCase());
    window.history.replaceState(null, '', url.toString());
  }, [role]);

  const value = useMemo<DemoRoleContextValue>(
    () => ({
      role,
      setRole
    }),
    [role]
  );

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole(): DemoRoleContextValue {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error('useDemoRole must be used within DemoRoleProvider');
  }

  return context;
}

export function canViewPricings(role: DemoRole): boolean {
  return role === 'OPS' || role === 'SALES';
}

export function canManagePricings(role: DemoRole): boolean {
  return role === 'OPS';
}

export function canManageSubscriptions(role: DemoRole): boolean {
  return role === 'OPS' || role === 'SALES';
}

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  OPS: 'Ops',
  SALES: 'Sales'
};

function getInitialRole(): DemoRole {
  if (typeof window === 'undefined') {
    return 'OPS';
  }

  const queryRole = normalizeRoleFromQuery(window.location.search);
  if (queryRole) {
    return queryRole;
  }

  const persistedRole = normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY) ?? '');
  return persistedRole ?? 'OPS';
}

function normalizeRole(value: string): DemoRole | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'OPS' || normalized === 'SALES') {
    return normalized;
  }

  return null;
}

function normalizeRoleFromQuery(search: string): DemoRole | null {
  const params = new URLSearchParams(search);
  const roleValue = params.get(ROLE_QUERY_PARAM);
  return roleValue ? normalizeRole(roleValue) : null;
}
