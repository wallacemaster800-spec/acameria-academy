import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// ✅ Tipo explícito derivado del hook para evitar desincronización
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // useAuth se ejecuta una sola vez aquí, globalmente.
  // Todos los consumidores reciben el mismo estado sin re-suscribirse.
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Error en desarrollo claro y accionable
    throw new Error(
      "useAuthContext must be used within <AuthProvider>. " +
      "Asegurate de que AuthProvider esté dentro de <BrowserRouter>."
    );
  }
  return ctx;
}
