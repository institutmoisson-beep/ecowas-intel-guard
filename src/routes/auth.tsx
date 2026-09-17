import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, ShieldHalf } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
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

type Challenge = { a: number; b: number; op: "+" | "-" | "×"; answer: number };

function newChallenge(): Challenge {
  const ops: Challenge["op"][] = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)]!;
  if (op === "×") {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    return { a, b, op, answer: a * b };
  }
  if (op === "-") {
    const a = 10 + Math.floor(Math.random() * 40);
    const b = 1 + Math.floor(Math.random() * 9);
    return { a, b, op, answer: a - b };
  }
  const a = 5 + Math.floor(Math.random() * 40);
  const b = 5 + Math.floor(Math.random() * 40);
  return { a, b, op, answer: a + b };
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<Challenge>(() => newChallenge());
  const [captcha, setCaptcha] = useState("");

  const captchaOk = Number(captcha.trim()) === challenge.answer && captcha.trim() !== "";

  function resetChallenge() {
    setChallenge(newChallenge());
    setCaptcha("");
  }

  function guardCaptcha(): boolean {
    if (!captchaOk) {
      toast.error("Vérification de sécurité", {
        description: "Résolvez correctement le calcul avant de continuer.",
      });
      resetChallenge();
      return false;
    }
    return true;
  }

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
    if (!guardCaptcha()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      resetChallenge();
      toast.error("Accès refusé", { description: error.message });
      return;
    }
    void logActivity("sign_in", "/auth", { method: "password" });
  }

  async function signUp() {
    if (!guardCaptcha()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      resetChallenge();
      toast.error("Enrôlement impossible", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Vérifiez votre e-mail", {
        description: "Confirmez votre adresse pour activer l'accès.",
      });
    } else {
      void logActivity("sign_up", "/auth", { method: "password" });
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

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Enrôlement</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label className="label-mono">Identifiant e-mail</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label className="label-mono">Clé d'accès</Label>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={showPassword ? "Masquer la clé d'accès" : "Afficher la clé d'accès"}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="label-mono">Vérification de sécurité</Label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 min-w-[96px] items-center justify-center rounded border border-border bg-panel px-3 font-mono text-sm tracking-widest">
                  {challenge.a} {challenge.op} {challenge.b} =
                </div>
                <Input
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  inputMode="numeric"
                  placeholder="?"
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={resetChallenge}
                  aria-label="Régénérer le calcul"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
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
      </div>
    </div>
  );
}
