import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Aurora from "@/components/Aurora"; 
import MagicBento from "@/components/MagicBento"; 
import "@/components/MagicBento.css"; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060010] relative overflow-hidden">
      {/* Estilos para forzar el fondo oscuro en autocompletado */}
      <style dangerouslySetInnerHTML={{ __html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: white !important;
          -webkit-box-shadow: 0 0 0px 1000px #1a1425 inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}} />

      <Aurora 
        colorStops={["#07b632", "#ae14f5", "#5227FF"]} 
        blend={0.46} 
        amplitude={1.0} 
        speed={0.5} 
      />

      <MagicBento glowColor="132, 0, 255" spotlightRadius={500}>
        <div className="flex items-center justify-center min-h-screen w-screen relative z-10 px-4">
          
          <div 
            className="magic-bento-card magic-bento-card--border-glow w-full max-w-md p-10 backdrop-blur-xl"
            style={{ 
              backgroundColor: 'rgba(6, 0, 16, 0.85)',
              minHeight: 'auto'
            } as any}
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none">ACAMERIA</h1>
              <p className="text-purple-300/50 text-xs mt-3 uppercase tracking-[0.3em] font-bold">Acceso Estudiantil</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-white/10 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all border-white/20"
                  required
                />
              </div>

              <div className="relative space-y-1">
                <input
                  type={show ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-white/10 rounded-xl p-4 bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all pr-12 border-white/20"
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
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl p-4 font-black uppercase tracking-widest shadow-[0_0_30px_rgba(132,0,255,0.3)] transition-all disabled:opacity-50 mt-4 active:scale-95"
              >
                {loading ? "Verificando..." : "Entrar a la Academia"}
              </button>
            </form>

            <div className="text-center mt-10 pt-6 border-t border-white/10 text-sm">
              <span className="text-gray-400">¿No tienes cuenta?</span>{" "}
              <Link to="/register" className="text-purple-400 font-black hover:text-purple-300 transition-colors ml-1">
                REGÍSTRATE
              </Link>
            </div>
          </div>
        </div>
      </MagicBento>
    </div>
  );
}