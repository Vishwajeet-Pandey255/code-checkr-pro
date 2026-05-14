import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [li, setLi] = useState({ email: "", password: "" });
  const [su, setSu] = useState({ email: "", password: "", fullName: "" });
  const [resetEmail, setResetEmail] = useState("");

  if (!loading && user) return <Navigate to="/" />;

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(li.email.trim(), li.password);
    setBusy(false);
    if (error) return toast.error(error);
    navigate({ to: "/" });
  };

  const onSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (su.password.length < 6) return toast.error("Password must be 6+ chars");
    setBusy(true);
    const { error } = await signUp(su.email.trim(), su.password, su.fullName.trim());
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Account created. Check your inbox to verify your email, then sign in.");
  };

  const onReset = async () => {
    if (!resetEmail) return toast.error("Enter your email");
    const { error } = await resetPassword(resetEmail.trim());
    if (error) return toast.error(error);
    toast.success("Password reset email sent.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
              iE
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold">AISECT Online OSM</h1>
              <p className="text-sm text-muted-foreground">Online Script Marking</p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-4 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={li.email}
                    onChange={(e) => setLi({ ...li, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="li-password">Password</Label>
                  <Input id="li-password" type="password" required value={li.password}
                    onChange={(e) => setLi({ ...li, password: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Input
                    placeholder="Email for password reset"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                    Reset
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-3">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={su.fullName}
                    onChange={(e) => setSu({ ...su, fullName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={su.email}
                    onChange={(e) => setSu({ ...su, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" type="password" required minLength={6} value={su.password}
                    onChange={(e) => setSu({ ...su, password: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  New accounts start as <strong>Student</strong>. An admin can promote your role.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}