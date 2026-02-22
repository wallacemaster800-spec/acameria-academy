import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPassword(){

const [email,setEmail]=useState("");
const [loading,setLoading]=useState(false);

const handleReset=async(e:React.FormEvent)=>{
e.preventDefault();
setLoading(true);

const { error } = await supabase.auth.resetPasswordForEmail(email,{
redirectTo:window.location.origin
});

setLoading(false);

if(error){
toast.error(error.message);
return;
}

toast.success("Password reset email sent");
};

return (

<div className="flex min-h-screen items-center justify-center bg-background px-4">

<div className="w-full max-w-sm">

<div className="mb-8 text-center">

<div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
<Mail className="h-7 w-7 text-primary"/>
</div>

<h1 className="text-2xl font-bold">Reset password</h1>

</div>

<form onSubmit={handleReset} className="space-y-4">

<div>
<Label>Email</Label>
<Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
</div>

<Button type="submit" className="w-full" disabled={loading}>
{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
Send reset email
</Button>

</form>

<p className="mt-6 text-center text-xs">
<Link to="/login" className="underline">
Back to login
</Link>
</p>

</div>

</div>

);
}