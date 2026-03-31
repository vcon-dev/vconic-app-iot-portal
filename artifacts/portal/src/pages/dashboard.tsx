import React from "react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Mic2, AlertTriangle, Activity, Database, GitMerge, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-primary font-mono animate-pulse">LOADING TELEMETRY...</div></div>;
  }

  if (!stats) return null;

  const statCards = [
    { title: "Total Devices", value: stats.totalDevices, icon: Server, color: "text-blue-500" },
    { title: "Active Devices", value: stats.activeDevices, icon: Activity, color: "text-primary" },
    { title: "Total vCons", value: stats.totalVcons, icon: Database, color: "text-purple-500" },
    { title: "vCons Today", value: stats.vconsToday, icon: Mic2, color: "text-primary" },
    { title: "Total Duration (s)", value: Math.round(stats.totalDuration), icon: Clock, color: "text-yellow-500" },
    { title: "Active Rules", value: stats.activeRules, icon: GitMerge, color: "text-indigo-500" },
    { title: "Pending Reposts", value: stats.pendingReposts, icon: Activity, color: "text-orange-500" },
    { title: "Failed Reposts", value: stats.failedReposts, icon: AlertTriangle, color: "text-destructive" },
  ];

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
      
      {/* Activity Feed placeholder */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Telemetry Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {/* To be replaced by useGetRecentActivity if we build it, but it was in the prompt */}
             <div className="text-sm text-muted-foreground font-mono">Event log is initializing...</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
