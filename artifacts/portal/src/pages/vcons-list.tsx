import React from "react";
import { Link } from "wouter";
import { useListVcons } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileJson, Mic2, Paperclip, BrainCircuit } from "lucide-react";

export default function VconsList() {
  const { data, isLoading } = useListVcons({ query: { queryKey: ["vcons"] } });

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">READING VCON ARCHIVE...</div>;
  }

  const vcons = data?.vcons || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">vCon Archive</h1>
          <p className="text-muted-foreground mt-1">Immutable conversation records</p>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">UUID</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">DEVICE</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">PARTIES</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">DURATION</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">EXTENSIONS</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">ROUTING</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground text-right">TIMESTAMP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vcons.map((vcon) => (
                <TableRow key={vcon.id} className="border-border hover:bg-secondary/20 transition-colors group">
                  <TableCell className="font-mono text-xs">
                    <Link href={`/vcons/${vcon.id}`} className="flex items-center gap-2 text-primary hover:underline">
                      <FileJson className="h-3 w-3" />
                      {vcon.uuid.split('-')[0]}...
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/devices/${vcon.deviceId}`} className="hover:text-primary transition-colors">
                      {vcon.deviceName || "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{vcon.partyCount}</TableCell>
                  <TableCell className="font-mono text-sm">{vcon.duration ? `${Math.round(vcon.duration)}s` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {vcon.hasAnalysis && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-sm px-1.5 py-0 title-xs"><BrainCircuit className="w-3 h-3 mr-1"/>Analysis</Badge>}
                      {vcon.hasAttachments && <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-sm px-1.5 py-0 title-xs"><Paperclip className="w-3 h-3 mr-1"/>Att</Badge>}
                      {!vcon.hasAnalysis && !vcon.hasAttachments && <span className="text-muted-foreground text-xs">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-sm px-1.5 py-0 text-xs font-mono
                      ${vcon.repostStatus === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        vcon.repostStatus === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        vcon.repostStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'}
                    `}>
                      {vcon.repostStatus.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {new Date(vcon.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {vcons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono">
                    NO VCONS DETECTED IN ARCHIVE
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
