import { AuthGate } from "@/components/layout/AuthGate";
import { SocketBridge } from "@/components/layout/SocketBridge";
import { Toaster } from "@/components/ui/Toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SocketBridge />
      {children}
      <Toaster />
    </AuthGate>
  );
}
