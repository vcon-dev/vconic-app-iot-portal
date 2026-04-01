import React from "react";
import { Link } from "wouter";
import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Mic2, AlertTriangle, Activity, Database, GitMerge, Clock, Wifi, Plus, ArrowRight, RefreshCw } from "lucide-react";

function formatRelativeTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  vcon_received:   { icon: Mic2,       color: "text-primary",      label: "vCon Received" },
  device_created:  { icon: Plus,       color: "text-blue-400",     label: "Device Registered" },
  device_assigned: { icon: ArrowRight, color: "text-indigo-400",   label: "Device Assigned" },
  repost_sent:     { icon: RefreshCw,  color: "text-purple-400",   label: "Repost Sent" },
  repost_failed:   { icon: AlertTriangle, color: "text-destructive", label: "Repost Failed" },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { refetchInterval: 15000 },
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary font-mono animate-pulse">LOADING TELEMETRY...</div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: "Total Devices",    value: stats.totalDevices,              icon: Server,        color: "text-blue-500" },
    { title: "Active Devices",   value: stats.activeDevices,             icon: Activity,      color: "text-primary" },
    { title: "Total vCons",      value: stats.totalVcons,                icon: Database,      color: "text-purple-500" },
    { title: "vCons Today",      value: stats.vconsToday,                icon: Mic2,          color: "text-primary" },
    { title: "Total Duration (s)", value: Math.round(stats.totalDuration), icon: Clock,       color: "text-yellow-500" },
    { title: "Active Rules",     value: stats.activeRules,               icon: GitMerge,      color: "text-indigo-500" },
    { title: "Pending Reposts",  value: stats.pendingReposts,            icon: Activity,      color: "text-orange-500" },
    { title: "Failed Reposts",   value: stats.failedReposts,             icon: AlertTriangle, color: "text-destructive" },
  ];

  const items = activity?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-sans">NOC Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-sm font-mono text-primary uppercase">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Telemetry Events</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Wifi className="h-3 w-3 text-primary" />
            <span>LIVE · refreshes every 15s</span>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="text-sm text-muted-foreground font-mono animate-pulse">Fetching event log...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground font-mono">
              No events yet. Events appear here when vCons are received, devices are registered, or reposts are sent.
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const cfg = EVENT_CONFIG[item.type] ?? { icon: Activity, color: "text-muted-foreground", label: item.type };
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-muted/30 transition-colors group"
                  >
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-semibold uppercase tracking-wide ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {item.deviceName && (
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            · {item.deviceName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 truncate mt-0.5">{item.message}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {item.vconId && (
                        <Link
                          to={`/vcons/${item.vconId}`}
                          className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                        >
                          VIEW →
                        </Link>
                      )}
                      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
