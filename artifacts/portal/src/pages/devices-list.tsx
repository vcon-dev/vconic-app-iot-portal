import React from "react";
import { Link } from "wouter";
import { useListDevices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Server, Activity, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DevicesList() {
  const { data, isLoading } = useListDevices();

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">FETCHING DEVICE MANIFEST...</div>;
  }

  const devices = data?.devices || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground mt-1">Manage field recording hardware and API endpoints</p>
        </div>
        <Button asChild>
          <Link href="/devices/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Register Device
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => (
          <Link key={device.id} href={`/devices/${device.id}`}>
            <Card className="bg-card border-border/50 hover:border-primary/50 cursor-pointer transition-all group h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                  </div>
                  <Badge variant={device.status === 'active' ? 'default' : device.status === 'error' ? 'destructive' : 'secondary'}
                    className={device.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-none' : ''}
                  >
                    {device.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-mono">{device.deviceType}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">MAC</span>
                    <span className="font-mono">{device.macAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">vCons</span>
                    <span className="font-mono">{device.vconCount}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Last Seen</span>
                    <span className="font-mono text-xs mt-0.5">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {devices.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-card/20">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No devices found</h3>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-4">You have not registered any recording devices yet.</p>
            <Button asChild variant="outline">
              <Link href="/devices/new">Register First Device</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
