import React, { useState } from "react";
import { useLocation } from "wouter";
import { 
  useGetDevice, 
  useDeleteDevice, 
  useRegenerateDeviceToken, 
  useUpdateDevice,
  getListDevicesQueryKey,
  getGetDeviceQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, Trash2, Power, PowerOff } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DeviceDetail({ params }: { params: { deviceId: string } }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: device, isLoading } = useGetDevice(params.deviceId);
  
  const deleteDevice = useDeleteDevice();
  const regenerateToken = useRegenerateDeviceToken();
  const updateDevice = useUpdateDevice();

  const [showToken, setShowToken] = useState(false);

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">FETCHING DEVICE SCHEMATICS...</div>;
  }

  if (!device) return <div>Device not found</div>;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDelete = () => {
    deleteDevice.mutate({ deviceId: device.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        toast.success("Device permanently deleted");
        setLocation("/devices");
      }
    });
  };

  const handleRegenerateToken = () => {
    regenerateToken.mutate({ deviceId: device.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeviceQueryKey(device.id) });
        toast.success("Authentication token regenerated");
        setShowToken(true);
      }
    });
  };

  const toggleStatus = () => {
    const newStatus = device.status === 'active' ? 'inactive' : 'active';
    updateDevice.mutate({ deviceId: device.id, data: { status: newStatus } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDeviceQueryKey(device.id), updated);
        toast.success(`Device suspended state changed to: ${newStatus}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/devices")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{device.name}</h1>
            <Badge variant={device.status === 'active' ? 'default' : device.status === 'error' ? 'destructive' : 'secondary'}
              className={device.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-none' : ''}
            >
              {device.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-xs">{device.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleStatus} className="gap-2">
            {device.status === 'active' ? <><PowerOff className="h-4 w-4"/> Suspend</> : <><Power className="h-4 w-4 text-primary"/> Activate</>}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the device and invalidate its authentication token. Associated vCons will remain but will be orphaned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Device
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">API Configuration</CardTitle>
              <CardDescription>Use these credentials on the hardware device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Gateway URL (recommended)</label>
                <p className="text-xs text-muted-foreground">Single shared endpoint — routes by token param or MAC address in vCon</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-black/50 p-3 rounded-md text-sm font-mono break-all text-primary border border-border">
                    {`https://vcon-gateway.replit.app/ingress?token=${device.token}`}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(`https://vcon-gateway.replit.app/ingress?token=${device.token}`, "Gateway URL")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Direct Ingest URL (per-device)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-black/50 p-3 rounded-md text-sm font-mono break-all text-primary/70 border border-border">
                    {device.ingestUrl}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(device.ingestUrl, "Endpoint URL")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Bearer Token</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-black/50 p-3 rounded-md text-sm font-mono break-all text-primary border border-border">
                    {showToken ? device.token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(device.token, "Token")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 border-yellow-500/20">
                      <RefreshCw className="h-4 w-4" /> Regenerate Token
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate Authentication Token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will invalidate the current token immediately. The hardware device will be unable to transmit data until it is updated with the new token.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRegenerateToken} className="bg-yellow-500 text-black hover:bg-yellow-400">
                        Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Platform</dt>
                  <dd className="font-mono bg-secondary/50 px-2 py-1 rounded inline-block">{device.deviceType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">MAC Address</dt>
                  <dd className="font-mono text-muted-foreground">{device.macAddress || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Total Payload Count</dt>
                  <dd className="font-mono text-xl text-primary">{device.vconCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Last Transmission</dt>
                  <dd className="font-mono text-muted-foreground">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium mb-1">Registered</dt>
                  <dd className="font-mono text-muted-foreground">{new Date(device.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
