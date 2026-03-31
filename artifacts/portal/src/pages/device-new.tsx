import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateDevice, getListDevicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  deviceType: z.string().min(1, "Device type is required"),
  macAddress: z.string().optional(),
  vconicId: z.string().regex(/^(VC-[A-Za-z0-9]+)?$/, "Must be in VC-XXXXXX format or blank").optional(),
  description: z.string().optional(),
});

export default function DeviceNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createDevice = useCreateDevice();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", deviceType: "m5stack-atoms3", macAddress: "", vconicId: "", description: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createDevice.mutate({ data: values }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        toast.success("Device registered successfully");
        setLocation(`/devices/${res.id}`);
      },
      onError: (err: any) => {
        toast.error(err.data?.message || "Failed to register device");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/devices")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Register Device</h1>
          <p className="text-muted-foreground mt-1">Provision a new IoT recording unit</p>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle>Hardware Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Front Desk Mic 01" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>A recognizable name for this unit.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hardware Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="m5stack-atoms3">M5Stack ATOM S3</SelectItem>
                        <SelectItem value="m5stack-core2">M5Stack Core2</SelectItem>
                        <SelectItem value="raspberry-pi-4">Raspberry Pi 4</SelectItem>
                        <SelectItem value="esp32-custom">Custom ESP32</SelectItem>
                        <SelectItem value="other">Other / Generic API</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="macAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MAC Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="84:1F:E8:83:29:24" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>Used for automatic gateway routing if the device embeds its MAC in vCons.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vconicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>vConic ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="VC-832924" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>The <code className="text-xs">VC-XXXXXX</code> identifier from the device firmware. Can be used as a gateway routing token instead of <code className="text-xs">dvt_xxx</code>.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Installed near the main entrance..." className="resize-none font-mono min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/devices")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDevice.isPending}>
                  {createDevice.isPending ? "REGISTERING..." : "REGISTER UNIT"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
