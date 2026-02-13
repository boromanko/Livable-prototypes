import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProductsPricingPage } from './pages/ProductsPricingPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/products-pricing" element={<ProductsPricingPage />} />
        <Route path="*" element={<Navigate to="/products-pricing" replace />} />
      </Route>
    </Routes>
  );
}
