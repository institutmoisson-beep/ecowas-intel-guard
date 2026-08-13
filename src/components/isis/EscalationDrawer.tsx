import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS, fakeHash } from "@/lib/isis";

export function EscalationDrawer() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("TikTok");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("takedown_actions").insert({
        platform,
        content_url: url,
        notice_type: "defamation",
        status: "submitted",
        evidence_hash: fakeHash(url),
        notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escalade enregistrée", { description: "Notice transmise au module M3." });
      void queryClient.invalidateQueries();
      setUrl("");
      setNotes("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Échec de l'escalade", { description: e.message }),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="destructive" className="pulse-threat gap-2 font-mono text-xs">
          <Siren className="h-4 w-4" />
          ESCALADE
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono tracking-widest">ESCALADE RAPIDE</SheetTitle>
          <SheetDescription>
            Déclenche une notice de retrait immédiate et scelle une preuve horodatée.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label className="label-mono">Plateforme</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="label-mono">URL du contenu</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tiktok.com/@..."
            />
          </div>
          <div className="space-y-2">
            <Label className="label-mono">Note opérationnelle</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <Button
            className="w-full"
            variant="destructive"
            disabled={!url || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Déclencher l'escalade
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
