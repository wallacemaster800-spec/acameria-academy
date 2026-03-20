import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CertificateEmissionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  userId: string;
  userEmail?: string;
};

type CertificatesRow = Tables<"certificates">;

type CertificateIdRow = Pick<CertificatesRow, "id">;

function safeErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer la imagen."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function formatDateEs(date: Date) {
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "2-digit" });
}

export function CertificateEmissionDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  userId,
}: CertificateEmissionDialogProps) {
  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [certCode, setCertCode] = useState<string | null>(null);

  const dialogDomain = useMemo(() => window.location.origin, []);

  useEffect(() => {
    if (!open) {
      setFullName("");
      setDni("");
      setIsGenerating(false);
      setGenerationError(null);
      setCertCode(null);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isGenerating) return;
    onOpenChange(nextOpen);
  };

  const canGenerate = fullName.trim().length > 0 && dni.trim().length > 0 && !isGenerating;

  const handleCopy = async () => {
    if (!certCode) return;
    try {
      await navigator.clipboard.writeText(certCode);
      toast.success("Código copiado.");
    } catch {
      toast.error("No se pudo copiar el código. Intentá manualmente.");
    }
  };

  const handleGenerateAndDownload = async () => {
    if (!userId || !courseId) {
      setGenerationError("Faltan datos para generar el certificado.");
      return;
    }

    const nameValue = fullName.trim();
    const dniValue = dni.trim();
    if (!nameValue || !dniValue) {
      setGenerationError("Completá todos los campos requeridos.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // 1) upsert y recuperar id
      const { data, error } = await supabase
        .from("certificates")
        .upsert(
          { user_id: userId, course_id: courseId },
          { onConflict: "user_id,course_id" }
        )
        .select("id")
        .single();

      if (error) throw error;
      const certificateId = (data as CertificateIdRow).id;

      // 2) certCode = primeros 8 caracteres del uuid (mayúsculas)
      const code = certificateId.slice(0, 8).toUpperCase();
      setCertCode(code);

      // 3) Generación de PDF
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Fondo negro
      doc.setFillColor(13, 13, 18); // #0d0d12
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      const centerX = pageWidth / 2;

      // Cargar logo (si no existe, continuamos el PDF con un reemplazo simple).
      try {
        const logoRes = await fetch("/acameria.png");
        if (!logoRes.ok) throw new Error("No se pudo cargar /acameria.png para el certificado.");
        const logoBlob = await logoRes.blob();
        const logoDataUrl = await blobToDataUrl(logoBlob);

        // Logo centrado arriba
        const logoW = 170;
        const logoH = 60;
        const logoX = (pageWidth - logoW) / 2;
        const logoY = 22;
        doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
      } catch {
        // Reemplazo si falta el asset
        doc.setTextColor(124, 58, 237); // #7c3aed
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("ACAMERIA", centerX, 60, { align: "center" });
      }

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("CERTIFICADO DE FINALIZACIÓN", centerX, 115, { align: "center" });

      // Nombre del usuario (grande y destacado)
      doc.setFontSize(30);
      doc.setTextColor(124, 58, 237); // #7c3aed
      doc.text(nameValue, centerX, 205, { align: "center" });

      // Documento (opcional, para incluir DNI en el PDF)
      doc.setFontSize(12);
      doc.setTextColor(220, 220, 230);
      doc.text(`Documento: ${dniValue}`, centerX, 238, { align: "center" });

      // Curso
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("Ha completado exitosamente el curso:", centerX, 285, { align: "center" });

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(courseTitle, centerX, 315, { align: "center" });

      // Fecha
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 230);
      doc.text(`Fecha de emisión: ${formatDateEs(new Date())}`, centerX, 348, {
        align: "center",
      });

      // Línea separadora decorativa (púrpura)
      const separatorY = 385;
      doc.setDrawColor(124, 58, 237); // #7c3aed
      doc.setLineWidth(2);
      doc.line(56, separatorY, pageWidth - 56, separatorY);

      // Pie: código + link de verificación
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`Código de verificación: ${code}`, centerX, pageHeight - 60, { align: "center" });

      doc.setTextColor(200, 200, 220);
      doc.setFontSize(11);
      doc.text(`Verificar en: ${dialogDomain}/verificar/${code}`, centerX, pageHeight - 38, {
        align: "center",
      });

      // 4) Descargar PDF
      doc.save("certificado-acameria.pdf");

      toast.success("Certificado generado y descargado.");
    } catch (e) {
      const message = safeErrorMessage(e);
      setGenerationError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyUrl = certCode ? `${dialogDomain}/verificar/${certCode}` : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0d0d12] border border-white/20 p-0 overflow-hidden sm:max-w-xl">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-white">Emitir Certificado</DialogTitle>
            <DialogDescription className="text-white/70">
              Tu nombre y DNI se usan solo para generar el PDF. No se guardan en nuestros
              servidores.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white/80">
                Nombre completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni" className="text-white/80">
                DNI / Documento
              </Label>
              <Input
                id="dni"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                placeholder="Ej. 12345678"
              />
            </div>

            {generationError ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
                <p className="text-red-200 font-bold">No se pudo generar el certificado.</p>
                <p className="text-red-100/80 text-sm mt-1">{generationError}</p>
              </div>
            ) : null}
          </div>

          {certCode ? (
            <div className="mt-5 rounded-xl border border-white/20 bg-white/5 p-4">
              <p className="text-green-300 font-bold">Certificado generado correctamente.</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  readOnly
                  value={certCode}
                  className="bg-black/20 border-white/10 text-white font-mono"
                />
                <Button variant="outline" onClick={handleCopy} disabled={isGenerating}>
                  Copiar código
                </Button>
              </div>
              {verifyUrl ? (
                <p className="text-xs text-white/60 mt-2">
                  Verificá en: <span className="text-white/80">{verifyUrl}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 border-t border-white/10 bg-[#0d0d12]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button onClick={handleGenerateAndDownload} disabled={!canGenerate} className="bg-purple-600 hover:bg-purple-500 text-white font-bold">
            {isGenerating ? "Generando..." : "Generar y Descargar Certificado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

