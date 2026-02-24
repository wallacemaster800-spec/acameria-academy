import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (errorParam) {
        console.error("[AuthCallback] Error OAuth:", errorParam, errorDescription);
        navigate("/login?error=" + encodeURIComponent(errorDescription || errorParam), { replace: true });
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[AuthCallback] exchangeCodeForSession error:", error.message);
          navigate("/login", { replace: true });
          return;
        }
      }

      navigate("/dashboard", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#060010]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
        <p className="text-purple-300/60 text-sm uppercase tracking-widest">Verificando acceso...</p>
      </div>
    </div>
  );
}