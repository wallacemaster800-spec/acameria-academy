import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GraduationCap, Eye, EyeOff } from "lucide-react";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (birthDate) {
      const age = Math.floor(
        (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );
      if (age < 13) {
        toast.error("Debes tener al menos 13 años para registrarte.");
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          birth_date: birthDate || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("¡Cuenta creada! Revisá tu email para confirmar tu cuenta.");
    navigate("/login");
  };

  const handleGoogleRegister = async () => {
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
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8);
          cursor: pointer;
        }
      `}} />

      <Aurora colorStops={["#07b632", "#ae14f5", "#5227FF"]} blend={0.46} amplitude={1.0} speed={0.5} />

      <MagicBento glowColor="132, 0, 255" spotlightRadius={500}>
        <div className="flex items-center justify-center min-h-screen w-screen relative z-10 px-4 py-10">
          <div
            className="magic-bento-card magic-bento-card--border-glow w-full max-w-md p-10 backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(6, 0, 16, 0.85)', minHeight: 'auto' } as any}
          >
            <div className="text-center mb-8">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/30 shadow-[0_0_20px_rgba(132,0,255,0.2)]">
                <GraduationCap className="h-8 w-8 text-purple-400"/>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter italic">NUEVA CUENTA</h1>
              <p className="text-purple-300/50 text-xs mt-2 uppercase tracking-[0.2em] font-bold">Únete a la Academia</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                required
                autoComplete="name"
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                required
                autoComplete="email"
              />

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all pr-12"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 ml-1 font-bold">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full border border-white/20 rounded-xl p-4 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all [color-scheme:dark]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl p-4 font-black uppercase tracking-widest shadow-[0_0_25px_rgba(132,0,255,0.25)] transition-all disabled:opacity-50 mt-2 flex items-center justify-center active:scale-95"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin"/> : "Registrarme"}
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
              onClick={handleGoogleRegister}
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
              {googleLoading ? "Conectando..." : "Registrarse con Google"}
            </button>

            <div className="text-center mt-8 pt-6 border-t border-white/5 text-sm">
              <span className="text-gray-400 font-medium">¿Ya tienes cuenta?</span>{" "}
              <Link to="/login" className="text-purple-400 font-black hover:text-purple-300 transition-colors ml-1 uppercase">
                Inicia Sesión
              </Link>
            </div>
          </div>
        </div>
      </MagicBento>
    </div>
  );
}