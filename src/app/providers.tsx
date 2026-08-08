import { TRPCReactProvider } from "@/__rpc/client";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </TRPCReactProvider>
  );
}
