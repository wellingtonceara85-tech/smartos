import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EmpresaProvider } from "./contexts/EmpresaContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { OrdensList } from "./pages/OrdensList";
import { NovaOS } from "./pages/NovaOS";
import { OrdemDetalhes } from "./pages/OrdemDetalhes";
import { EditarOS } from "./pages/EditarOS";
import { ClientesList } from "./pages/ClientesList";
import { NovoCliente } from "./pages/NovoCliente";
import { EditarCliente } from "./pages/EditarCliente";
import { ClienteDetalhes } from "./pages/ClienteDetalhes";
import { ConfiguracaoEmpresa } from "./pages/ConfiguracaoEmpresa";
import { GerenciarUsuarios } from "./pages/GerenciarUsuarios";
import { PrepararOrcamento } from "./pages/PrepararOrcamento";
import { SmartTrackPublic } from "./pages/SmartTrackPublic";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <EmpresaProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>

          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/ordens"
              element={
                <PrivateRoute>
                  <OrdensList />
                </PrivateRoute>
              }
            />
            <Route
              path="/ordens/nova"
              element={
                <PrivateRoute>
                  <NovaOS />
                </PrivateRoute>
              }
            />
            <Route
              path="/ordens/:id"
              element={
                <PrivateRoute>
                  <OrdemDetalhes />
                </PrivateRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <PrivateRoute>
                  <ClientesList />
                </PrivateRoute>
              }
            />
            <Route
              path="/clientes/:id"
              element={
                <PrivateRoute>
                  <ClienteDetalhes />
                </PrivateRoute>
              }
            />
            <Route
              path="/clientes/novo"
              element={
                <PrivateRoute>
                  <NovoCliente />
                </PrivateRoute>
              }
            />
            <Route
              path="/clientes/:id/editar"
              element={
                <PrivateRoute>
                  <EditarCliente />
                </PrivateRoute>
              }
            />
            <Route
              path="/ordens/:id/orcamento"
              element={
                <PrivateRoute>
                  <PrepararOrcamento />
                </PrivateRoute>
              }
            />
            <Route
              path="/ordens/:id/editar"
              element={
                <PrivateRoute>
                  <EditarOS />
                </PrivateRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <PrivateRoute>
                  <ConfiguracaoEmpresa />
                </PrivateRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <PrivateRoute>
                  <GerenciarUsuarios />
                </PrivateRoute>
              }
            />
            <Route path="/track/:token" element={<SmartTrackPublic />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;
