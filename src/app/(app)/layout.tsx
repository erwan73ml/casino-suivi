import { StoreProvider } from "@/components/store";
import { FormulaireProvider } from "@/components/formulaire";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <FormulaireProvider>
        <AppShell>{children}</AppShell>
      </FormulaireProvider>
    </StoreProvider>
  );
}
