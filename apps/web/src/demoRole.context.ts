import { createContext, useContext } from 'react';
import type { DemoRole } from './demoRole.shared';

export type DemoRoleContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

export const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function useDemoRole(): DemoRoleContextValue {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error('useDemoRole must be used within DemoRoleProvider');
  }

  return context;
}
