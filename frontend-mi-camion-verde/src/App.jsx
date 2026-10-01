import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { homeFor } from './lib/api';
import Shell from './components/Shell';
import PWABadge from './PWABadge';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import RoutesPage from './pages/RoutesPage';
import ReportsPage from './pages/ReportsPage';
import CreateReport from './pages/CreateReport';
import GuidePage from './pages/GuidePage';
import RequestsPage from './pages/RequestsPage';
import BillingPage from './pages/BillingPage';
import MorePage from './pages/MorePage';
import OperationPage from './pages/OperationPage';
import StaffRoutes, { StaffComplaints } from './pages/StaffRoutes';
import { GerenciaBarrios, GerenciaFinanzas, GerenciaHome, GerenciaImpacto, GerenciaUsuarios } from './pages/GerenciaPages';
import ComercialPage from './pages/ComercialPage';

function Guard({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to={homeFor(user.rol)} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route element={<Guard roles={['cliente']} />}>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="rutas" element={<RoutesPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="reportes/nuevo" element={<CreateReport />} />
            <Route path="guia" element={<GuidePage />} />
            <Route path="solicitudes" element={<RequestsPage />} />
            <Route path="facturacion" element={<BillingPage />} />
            <Route path="mas" element={<MorePage />} />
          </Route>
        </Route>
        <Route element={<Guard roles={['administrador_socio', 'gerente_general']} />}>
          <Route element={<Shell />}>
            <Route path="operacion" element={<OperationPage />} />
            <Route path="operacion/rutas" element={<StaffRoutes />} />
            <Route path="operacion/quejas" element={<StaffComplaints />} />
          </Route>
        </Route>
        <Route element={<Guard roles={['gerente_general']} />}>
          <Route element={<Shell />}>
            <Route path="gerencia" element={<GerenciaHome />} />
            <Route path="gerencia/impacto" element={<GerenciaImpacto />} />
            <Route path="gerencia/finanzas" element={<GerenciaFinanzas />} />
            <Route path="gerencia/barrios" element={<GerenciaBarrios />} />
            <Route path="gerencia/usuarios" element={<GerenciaUsuarios />} />
          </Route>
        </Route>
        <Route element={<Guard roles={['directora_admin_comercial', 'gerente_general', 'administrador_socio']} />}>
          <Route element={<Shell />}>
            <Route path="comercial" element={<ComercialPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWABadge />
    </>
  );
}
