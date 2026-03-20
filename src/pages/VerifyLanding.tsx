import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyLanding() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const normalizedCode = code.trim().toUpperCase();
  const isValid = normalizedCode.length === 8;

  const handleVerify = () => {
    if (!isValid) return;
    navigate(`/verificar/${normalizedCode}`);
  };

  return (
    <div className="min-h-screen bg-[#060010] relative overflow-hidden">
      <Aurora colorStops={["#07b632", "#ae14f5", "#5227FF"]} blend={0.46} amplitude={1.0} speed={0.5} />
      <MagicBento glowColor="132, 0, 255" spotlightRadius={420}>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
            <div className="text-center mb-8">
              <p className="text-purple-300/50 text-xs uppercase tracking-[0.3em] font-bold">ACAMERIA</p>
              <h1 className="mt-3 text-3xl font-black text-white tracking-tight">Verificar Certificado</h1>
              <p className="text-white/70 text-sm mt-2">
                Ingresá el código de 8 caracteres para validar tu certificado.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, "").toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 font-mono tracking-widest text-lg"
              />

              <Button
                onClick={handleVerify}
                disabled={!isValid}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                Verificar
              </Button>

              <p className="text-xs text-white/50 text-center">
                Si ya tenés el certificado, copiá el código del banner.
              </p>
            </div>
          </div>
        </div>
      </MagicBento>
    </div>
  );
}

