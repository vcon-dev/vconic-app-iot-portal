import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import DevicesList from "@/pages/devices-list";
import DeviceNew from "@/pages/device-new";
import DeviceDetail from "@/pages/device-detail";
import VconsList from "@/pages/vcons-list";
import VconDetail from "@/pages/vcon-detail";
import RulesList from "@/pages/rules-list";
import RuleNew from "@/pages/rule-new";
import RuleEdit from "@/pages/rule-edit";
import UnassignedDevices from "@/pages/unassigned-devices";

// Setup token getter for custom-fetch
setAuthTokenGetter(() => localStorage.getItem("vconic_token"));

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();

  // Create query client with global error handler for 401s
  const [queryClient] = React.useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any) => {
        if (error?.status === 401) {
          setToken(null);
          setLocation("/login");
        }
      }
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          if (error?.status === 401) return false;
          return failureCount < 3;
        },
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        
        {/* Protected Routes */}
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        
        <Route path="/devices" component={() => <ProtectedRoute component={DevicesList} />} />
        <Route path="/devices/new" component={() => <ProtectedRoute component={DeviceNew} />} />
        <Route path="/devices/:deviceId" component={({ params }) => <ProtectedRoute component={DeviceDetail} params={params} />} />
        
        <Route path="/vcons" component={() => <ProtectedRoute component={VconsList} />} />
        <Route path="/vcons/:vconId" component={({ params }) => <ProtectedRoute component={VconDetail} params={params} />} />
        
        <Route path="/rules" component={() => <ProtectedRoute component={RulesList} />} />
        <Route path="/rules/new" component={() => <ProtectedRoute component={RuleNew} />} />
        <Route path="/rules/:ruleId" component={({ params }) => <ProtectedRoute component={RuleEdit} params={params} />} />

        <Route path="/unassigned" component={() => <ProtectedRoute component={UnassignedDevices} />} />

        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  );
}

function App() {
  // Ensure dark mode is applied
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <TooltipProvider>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
