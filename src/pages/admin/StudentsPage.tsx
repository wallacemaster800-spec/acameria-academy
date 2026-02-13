import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [duration, setDuration] = useState("3");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r) => { map[r.user_id] = r.role; });
      return map;
    },
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      // Sign up user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Failed to create user");

      // Calculate expiration
      const now = new Date();
      let expiresAt: string | null = null;
      if (duration !== "lifetime") {
        const months = parseInt(duration);
        expiresAt = (months >= 12 ? addYears(now, months / 12) : addMonths(now, months)).toISOString();
      }

      // Update profile with expiration
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ access_expires_at: expiresAt })
        .eq("id", signUpData.user.id);
      if (profileError) throw profileError;

      // Add student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: signUpData.user.id, role: "student" as const });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setOpen(false);
      setEmail("");
      setPassword("");
      setDuration("3");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatus = (expiresAt: string | null) => {
    if (!expiresAt) return "lifetime";
    return new Date(expiresAt) > new Date() ? "active" : "expired";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Students</h1>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Student
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((p) => {
                const status = getStatus(p.access_expires_at);
                const role = roles?.[p.id] ?? "student";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell>
                      <Badge variant={role === "admin" ? "default" : "secondary"} className="capitalize">
                        {role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.access_expires_at ? format(new Date(p.access_expires_at), "MMM d, yyyy") : "Lifetime"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "expired" ? "destructive" : "outline"}
                        className={status === "active" || status === "lifetime" ? "border-success text-success" : ""}>
                        {status === "lifetime" ? "Lifetime" : status === "active" ? "Active" : "Expired"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Add Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Access Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">1 Year</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addStudent.mutate()} disabled={addStudent.isPending || !email || !password}>
              {addStudent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
