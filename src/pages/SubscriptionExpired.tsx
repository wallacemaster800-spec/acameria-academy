import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";

export default function SubscriptionExpired() {

const navigate = useNavigate();

const handleSignOut = async () => {
await supabase.auth.signOut();
navigate("/login");
};

return (
<div className="flex min-h-screen items-center justify-center bg-background px-4">

<div className="max-w-md text-center">

<div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
<Clock className="h-8 w-8 text-destructive" />
</div>

<h1 className="text-2xl font-bold">
Subscription expired
</h1>

<p className="mt-3 text-muted-foreground">
Your academy access has expired.
<br/>
Contact the administrator to renew your subscription.
</p>

<Button variant="outline" onClick={handleSignOut} className="mt-6">
<LogOut className="mr-2 h-4 w-4"/>
Sign out
</Button>

</div>

</div>
);
}