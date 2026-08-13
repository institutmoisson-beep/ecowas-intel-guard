import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldHalf } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accès sécurisé — ISIS Command" },
      {
        name: "description",
        content:
          "Authentification du centre de commandement ISIS : cyber-intelligence et protection de marque en Afrique de l'Ouest.",
      },
      { property: "og:title", content: "Accès sécurisé — ISIS Command" },
      {
        property: "og:description",
        content: "Portail d'authentification de la suite ISIS pour la région CEDEAO.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void navigate({ to: "/command" });
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) void navigate({ to: "/command" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error("Accès refusé", { description: error.message });
  }

  async function signUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error("Enrôlement impossible", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Vérifiez votre e-mail", {
        description: "Confirmez votre adresse pour activer l'accès.",
      });
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google indisponible", { description: String(result.error) });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md panel scanline p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-verified/15 text-verified">
            <ShieldHalf className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-lg font-bold tracking-widest">ISIS</p>
            <p className="label-mono">Ignite Shield &amp; Intelligence Suite</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Accès restreint aux opérateurs habilités. Toutes les sessions sont journalisées.
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Enrôlement</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label className="label-mono">Identifiant e-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label className="label-mono">Clé d'accès</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </div>
          </div>

          <TabsContent value="signin" className="mt-4">
            <Button className="w-full" disabled={loading} onClick={() => void signIn()}>
              Ouvrir la session
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <Button className="w-full" disabled={loading} onClick={() => void signUp()}>
              Créer un accès opérateur
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => void google()}>
          Continuer avec Google
        </Button>
      </div>
    </div>
  );
}
