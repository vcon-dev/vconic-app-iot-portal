import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListDevices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Server, Clock, ArrowRight, UserPlus, Loader2, Wifi, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const GATEWAY_DEFAULT_URL = "https://vcon-gateway.replit.app/ingress";

interface UnassignedGroup {
  deviceIdentifier: string;
  vconCount: number;
  firstSeen: string;
  lastSeen: string;
  samplePartyName?: string;
  recentVcons: Array<{ id: string; uuid: string | null; createdAt: string }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getToken(): string | null {
  return localStorage.getItem("vconic_token");
}

async function fetchUnassigned(): Promise<{ groups: UnassignedGroup[]; total: number }> {
  const res = await fetch("/api/admin/unassigned", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to load unassigned devices");
  return res.json();
}

async function assignDevice(deviceIdentifier: string, deviceId: string): Promise<void> {
  const res = await fetch(`/api/admin/unassigned/${encodeURIComponent(deviceIdentifier)}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Assignment failed");
  }
}

async function deleteUnassigned(deviceIdentifier: string): Promise<void> {
  const res = await fetch(`/api/admin/unassigned/${encodeURIComponent(deviceIdentifier)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Deletion failed");
  }
}

async function createAccountForDevice(
  deviceIdentifier: string,
  body: { name: string; email: string; password: string; deviceName: string; deviceType?: string }
): Promise<void> {
  const res = await fetch(
    `/api/admin/unassigned/${encodeURIComponent(deviceIdentifier)}/create-account`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Account creation failed");
  }
}

function DeleteConfirmDialog({
  group,
  open,
  onClose,
}: {
  group: UnassignedGroup;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteUnassigned(group.deviceIdentifier),
    onSuccess: () => {
      toast.success(`Removed ${group.vconCount} unassigned vCon(s)`);
      qc.invalidateQueries({ queryKey: ["unassigned"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Remove Unassigned Device
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This will permanently delete all queued vCons from this device. They cannot be recovered.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-muted-foreground font-mono">Device Identifier</p>
            <p className="text-sm font-mono text-destructive mt-0.5">{group.deviceIdentifier}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {group.vconCount} vCon(s) will be permanently deleted
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete {group.vconCount} vCon(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  group,
  open,
  onClose,
}: {
  group: UnassignedGroup;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const { data: devicesData } = useListDevices();
  const devices = devicesData?.devices || [];

  const mutation = useMutation({
    mutationFn: () => assignDevice(group.deviceIdentifier, selectedDeviceId),
    onSuccess: () => {
      toast.success(`vCons assigned successfully`);
      qc.invalidateQueries({ queryKey: ["unassigned"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Assign to Existing Device
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-md bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground font-mono">Device Identifier</p>
            <p className="text-sm font-mono text-primary mt-0.5">{group.deviceIdentifier}</p>
            <p className="text-xs text-muted-foreground mt-1">{group.vconCount} vCon(s) will be migrated</p>
          </div>
          <div className="space-y-2">
            <Label>Select Device</Label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Choose a registered device..." />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span>{d.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{d.deviceType}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedDeviceId || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Assign {group.vconCount} vCon(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateAccountDialog({
  group,
  open,
  onClose,
}: {
  group: UnassignedGroup;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    deviceName: group.samplePartyName || group.deviceIdentifier,
    deviceType: "m5stack-core2",
  });

  const mutation = useMutation({
    mutationFn: () => createAccountForDevice(group.deviceIdentifier, form),
    onSuccess: () => {
      toast.success("Account created and vCons migrated");
      qc.invalidateQueries({ queryKey: ["unassigned"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isValid = form.name && form.email && form.password.length >= 8 && form.deviceName;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create New Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-md bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground font-mono">Device Identifier</p>
            <p className="text-sm font-mono text-primary mt-0.5">{group.deviceIdentifier}</p>
            <p className="text-xs text-muted-foreground mt-1">{group.vconCount} vCon(s) will be migrated</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Jane Smith" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password (min 8 chars)</Label>
            <Input id="password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input id="deviceName" value={form.deviceName} onChange={set("deviceName")} placeholder="Recorder #1" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deviceType">Device Type</Label>
              <Input id="deviceType" value={form.deviceType} onChange={set("deviceType")} placeholder="m5stack-core2" className="bg-secondary border-border" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Account & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UnassignedDevices() {
  const qc = useQueryClient();
  const [assignGroup, setAssignGroup] = useState<UnassignedGroup | null>(null);
  const [createGroup, setCreateGroup] = useState<UnassignedGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<UnassignedGroup | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["unassigned"],
    queryFn: fetchUnassigned,
    refetchInterval: 30000,
  });

  const groups = data?.groups || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unassigned Devices</h1>
          <p className="text-muted-foreground mt-1">
            vCons received from unrecognized devices — assign or create accounts to claim them
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Gateway URL info panel */}
      <Card className="bg-card border-border/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Wifi className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium">Default Gateway Endpoint</p>
              <p className="text-xs text-muted-foreground">
                Devices push vCons to this URL. Routing is determined by{" "}
                <code className="text-primary">?token=dvt_xxx</code> query param or the MAC address inside the vCon.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs font-mono bg-secondary px-3 py-1.5 rounded-md text-primary border border-border">
                  POST {GATEWAY_DEFAULT_URL}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    navigator.clipboard.writeText(GATEWAY_DEFAULT_URL);
                    toast.success("Copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                With token: <code className="text-primary">{GATEWAY_DEFAULT_URL}?token=dvt_xxx</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-primary font-mono animate-pulse">SCANNING FOR UNASSIGNED DEVICES...</div>
      )}

      {isError && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">Failed to load unassigned devices</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && groups.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No unassigned devices</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              All received vCons have been matched to registered devices
            </p>
          </CardContent>
        </Card>
      )}

      {groups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {data?.total} unassigned vCon(s)
            </Badge>
            <span className="text-muted-foreground text-xs">from {groups.length} device(s)</span>
          </div>

          {groups.map((group) => (
            <Card key={group.deviceIdentifier} className="bg-card border-border/50 hover:border-amber-500/40 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-mono truncate">{group.deviceIdentifier}</CardTitle>
                      {group.samplePartyName && (
                        <p className="text-xs text-muted-foreground">{group.samplePartyName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => setAssignGroup(group)}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                      Assign to Device
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCreateGroup(group)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Create Account
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteGroup(group)}
                      title="Remove this device and its vCons"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">vCons Received</p>
                    <p className="font-semibold text-amber-400">{group.vconCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">First Seen</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs">{timeAgo(group.firstSeen)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Seen</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs">{timeAgo(group.lastSeen)}</p>
                    </div>
                  </div>
                </div>

                {group.recentVcons.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Recent vCons</p>
                    <div className="space-y-1">
                      {group.recentVcons.slice(0, 3).map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-xs">
                          <code className="text-muted-foreground font-mono">{v.uuid || v.id.slice(0, 16) + "..."}</code>
                          <span className="text-muted-foreground/60">{timeAgo(v.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {assignGroup && (
        <AssignDialog
          group={assignGroup}
          open={!!assignGroup}
          onClose={() => setAssignGroup(null)}
        />
      )}

      {createGroup && (
        <CreateAccountDialog
          group={createGroup}
          open={!!createGroup}
          onClose={() => setCreateGroup(null)}
        />
      )}

      {deleteGroup && (
        <DeleteConfirmDialog
          group={deleteGroup}
          open={!!deleteGroup}
          onClose={() => setDeleteGroup(null)}
        />
      )}
    </div>
  );
}
