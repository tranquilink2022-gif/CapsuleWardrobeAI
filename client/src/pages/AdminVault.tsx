import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AdminVaultManagement from "@/components/AdminVaultManagement";

export default function AdminVault() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            data-testid="button-back-to-profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Vault Management</h1>
        </div>

        <AdminVaultManagement />
      </div>
    </div>
  );
}
