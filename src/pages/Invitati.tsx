import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddInvitatoDialog } from "@/components/AddInvitatoDialog";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Invitati = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { wedding, isLoading: isLoadingWedding } = useCurrentMatrimonio();

  const { data: invitati, isLoading: isLoadingInvitati } = useQuery({
    queryKey: ["invitati", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("invitati")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!wedding?.id,
  });

  const isLoading = isLoadingWedding || isLoadingInvitati;
  const hasGuests = invitati && invitati.length > 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nessun matrimonio associato</h2>
          <p className="text-muted-foreground">
            Non hai accesso a nessun matrimonio al momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invitati</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Invitato
        </Button>
      </div>

      {!hasGuests ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Nessun invitato ancora
          </h2>
          <p className="text-muted-foreground max-w-md">
            Inizia ad aggiungere i tuoi invitati al matrimonio
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Guest list will be implemented later */}
          <p className="text-sm text-muted-foreground">
            {invitati.length} invitat{invitati.length === 1 ? "o" : "i"} aggiunt{invitati.length === 1 ? "o" : "i"}
          </p>
        </div>
      )}

      <AddInvitatoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        weddingId={wedding.id}
      />
    </div>
  );
};

export default Invitati;
