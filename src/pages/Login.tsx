import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    navigate("/");
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060010] relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: white !important;
          -webkit-box-shadow: 0 0 0px 1000px #1a1425 inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}} />

      <Aurora colorStops={["#07b632", "#ae14f5", "#5227FF"]} blend={0.46} amplitude={1.0} speed={0.5} />

      <MagicBento glowColor="132, 0, 255" spotlightRadius={500}>
        <div className="flex items-center justify-center min-h-screen w-screen relative z-10 px-4">
          <div
            className="magic-bento-card magic-bento-card--border-glow w-full max-w-md p-10 backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(6, 0, 16, 0.85)', minHeight: 'auto' } as any}
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none">ACAMERIA</h1>
              <p className="text-purple-300/50 text-xs mt-3 uppercase tracking-[0.3em] font-bold">Acceso Estudiantil</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                required
              />

              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-20"
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl p-4 font-black uppercase tracking-widest shadow-[0_0_30px_rgba(132,0,255,0.3)] transition-all disabled:opacity-50 mt-4 active:scale-95 flex items-center justify-center"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar a la Academia"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#060010] px-2 text-gray-500 tracking-widest font-bold">o continúa con</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl p-3 font-bold transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? "Conectando..." : "Continuar con Google"}
            </button>

            <div className="text-center mt-10 pt-6 border-t border-white/10 text-sm">
              <span className="text-gray-400">¿No tienes cuenta?</span>{" "}
              <Link to="/register" className="text-purple-400 font-black hover:text-purple-300 transition-colors ml-1">
                REGÍSTRATE
              </Link>
            </div>
            <div className="text-center mt-3">
              <Link to="/forgot-password" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        </div>
      </MagicBento>
    </div>
  );
}