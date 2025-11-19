import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Matrimoni from "./pages/Matrimoni";
import Dashboard from "./pages/Dashboard";
import Invitati from "./pages/Invitati";
import Famiglie from "./pages/Famiglie";
import Gruppi from "./pages/Gruppi";
import Tavoli from "./pages/Tavoli";
import Impostazioni from "./pages/Impostazioni";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1">
        <header className="sticky top-0 z-10 h-14 flex items-center border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  </SidebarProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/admin"
            element={
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/matrimoni"
            element={
              <AppLayout>
                <Matrimoni />
              </AppLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/invitati"
            element={
              <AppLayout>
                <Invitati />
              </AppLayout>
            }
          />
          <Route
            path="/famiglie"
            element={
              <AppLayout>
                <Famiglie />
              </AppLayout>
            }
          />
          <Route
            path="/gruppi"
            element={
              <AppLayout>
                <Gruppi />
              </AppLayout>
            }
          />
          <Route
            path="/tavoli"
            element={
              <AppLayout>
                <Tavoli />
              </AppLayout>
            }
          />
          <Route
            path="/impostazioni"
            element={
              <AppLayout>
                <Impostazioni />
              </AppLayout>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
