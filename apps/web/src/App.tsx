import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { getDemoAccessPassword, subscribeDemoAccessChanges } from './lib/demoAccess';
import { LoginPage } from './pages/LoginPage';
import { ProductsPricingPage } from './pages/ProductsPricingPage';

export function App(): JSX.Element {
  const [hasDemoAccess, setHasDemoAccess] = useState(() => getDemoAccessPassword().length > 0);

  useEffect(() => {
    return subscribeDemoAccessChanges(() => {
      setHasDemoAccess(getDemoAccessPassword().length > 0);
    });
  }, []);

  if (!hasDemoAccess) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/products-pricing" element={<ProductsPricingPage />} />
        <Route path="*" element={<Navigate to="/products-pricing" replace />} />
      </Route>
    </Routes>
  );
}
