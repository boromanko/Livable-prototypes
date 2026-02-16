import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DemoRoleContext, type DemoRoleContextValue } from './demoRole.context';
import {
  ROLE_QUERY_PARAM,
  ROLE_STORAGE_KEY,
  normalizeRole,
  normalizeRoleFromQuery,
  type DemoRole
} from './demoRole.shared';

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
