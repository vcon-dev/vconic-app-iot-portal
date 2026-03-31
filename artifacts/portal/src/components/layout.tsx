import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Server, Mic2, GitMerge, LogOut, AlertTriangle } from "lucide-react";
import { Logo } from "./logo";
import { useLogoutUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/devices", label: "Devices", icon: Server },
  { href: "/vcons", label: "vCons", icon: Mic2 },
  { href: "/rules", label: "Routing Rules", icon: GitMerge },
  { href: "/unassigned", label: "Unassigned Devices", icon: AlertTriangle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { setToken } = useAuth();
  const logout = useLogoutUser();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setToken(null);
        setLocation("/login");
        toast.success("Logged out successfully");
      },
      onError: () => {
        // Fallback clear token even if server fails
        setToken(null);
        setLocation("/login");
      }
    });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Logo />
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        
        {/* Mobile Nav (simple bottom bar or just rely on hamburger - let's do a simple quick links below header for now) */}
        <div className="md:hidden flex overflow-x-auto border-b border-border bg-card/50 p-2 gap-2">
          {navItems.map(item => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
