import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetVcon, getGetVconQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MessageSquare, BrainCircuit, Paperclip, Code, Clock } from "lucide-react";

export default function VconDetail({ params }: { params: { vconId: string } }) {
  const [, setLocation] = useLocation();
  const { data: vcon, isLoading } = useGetVcon(params.vconId);
  const [showRaw, setShowRaw] = useState(false);

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">DECRYPTING VCON PAYLOAD...</div>;
  }

  if (!vcon) return <div>vCon not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vcons")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono break-all">{vcon.uuid}</h1>
            <Badge variant="outline" className={`rounded-sm font-mono
                ${vcon.repostStatus === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  vcon.repostStatus === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                  vcon.repostStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                  'bg-gray-500/10 text-gray-400 border-gray-500/20'}
              `}>
                ROUTING: {vcon.repostStatus.toUpperCase()} {vcon.repostAttempts > 0 && `(${vcon.repostAttempts})`}
            </Badge>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(vcon.createdAt).toLocaleString()}</span>
            <span>SOURCE: {vcon.deviceName || vcon.deviceId}</span>
            <span>V: {vcon.vconVersion || '0.0.1'}</span>
          </div>
        </div>
      </div>

      {vcon.subject && (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1">Subject</h3>
            <p className="text-lg">{vcon.subject}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Parties ({vcon.parties?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {vcon.parties?.map((party, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{party.name || `Party ${idx}`}</div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {party.tel && <div><span className="text-xs font-mono uppercase mr-2">TEL</span>{party.tel}</div>}
                      {party.mailto && <div><span className="text-xs font-mono uppercase mr-2">MAIL</span>{party.mailto}</div>}
                    </div>
                  </div>
                  {party.role && <Badge variant="secondary" className="font-mono text-xs">{party.role}</Badge>}
                </div>
              </div>
            ))}
            {(!vcon.parties || vcon.parties.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO PARTIES DEFINED</div>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Dialog ({vcon.dialog?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {vcon.dialog?.map((dlg, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <div className="flex justify-between mb-2">
                  <Badge variant="outline" className="font-mono border-primary/30 text-primary">{dlg.type.toUpperCase()}</Badge>
                  {dlg.duration && <span className="text-xs font-mono text-muted-foreground">{dlg.duration}s</span>}
                </div>
                {dlg.start && <div className="text-xs text-muted-foreground mb-2">{new Date(dlg.start).toLocaleString()}</div>}
                
                {dlg.type === 'text' && dlg.body && (
                  <div className="bg-black/50 p-3 rounded border border-border text-sm break-words whitespace-pre-wrap">
                    {dlg.body}
                  </div>
                )}
                {dlg.type === 'recording' && (
                  <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-2">
                    {dlg.mediatype && <span>Format: <code className="text-xs">{dlg.mediatype}</code></span>}
                    {dlg.url && <span>URL: <a href={dlg.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">{dlg.url}</a></span>}
                    {dlg.body && !dlg.url && <span>Contains inline encoded audio body ({dlg.encoding})</span>}
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Parties: {dlg.parties?.join(', ') || 'all'}
                </div>
              </div>
            ))}
            {(!vcon.dialog || vcon.dialog.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO DIALOG SEGMENTS</div>
            )}
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-blue-400" />
              Analysis ({vcon.analysis?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-96">
            {vcon.analysis?.map((an, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">{an.type}</Badge>
                  <Badge variant="outline" className="text-muted-foreground">{an.vendor}</Badge>
                </div>
                {an.body && (
                  <div className="mt-2">
                    <details className="group">
                      <summary className="text-xs text-primary cursor-pointer hover:underline font-mono">VIEW PAYLOAD</summary>
                      <pre className="mt-2 text-xs bg-black/80 p-3 rounded overflow-x-auto border border-border text-gray-300 whitespace-pre-wrap">
                        {typeof an.body === 'string' && an.body.startsWith('{') ? JSON.stringify(JSON.parse(an.body), null, 2) : an.body}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
            {(!vcon.analysis || vcon.analysis.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO ANALYSIS MODULES</div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-purple-400" />
              Attachments ({vcon.attachments?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-96">
            {vcon.attachments?.map((att, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <Badge variant="secondary" className="mb-2 font-mono">{att.purpose}</Badge>
                <div className="text-xs text-muted-foreground space-y-1">
                  {att.mediatype && <div>Type: {att.mediatype}</div>}
                  {att.party !== undefined && <div>Ref Party: {att.party}</div>}
                  {att.dialog !== undefined && <div>Ref Dialog: {att.dialog}</div>}
                </div>
              </div>
            ))}
            {(!vcon.attachments || vcon.attachments.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO ATTACHMENTS</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="cursor-pointer hover:bg-secondary/10 transition-colors" onClick={() => setShowRaw(!showRaw)}>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-muted-foreground" />
              Raw vCon Source
            </div>
            <Button variant="ghost" size="sm" className="font-mono text-xs">
              {showRaw ? "HIDE" : "EXPAND"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showRaw && (
          <CardContent className="border-t border-border/50 pt-4">
            <pre className="bg-[#0a0a0a] p-4 rounded-md overflow-x-auto text-xs font-mono text-[#a5d6ff] border border-border">
              {JSON.stringify(JSON.parse(vcon.rawJson), null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
