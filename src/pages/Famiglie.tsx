import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ChevronDown,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditInvitatoSheet } from "@/components/EditInvitatoSheet";

const Famiglie = () => {
  const { wedding, isLoading: isLoadingWedding } = useCurrentMatrimonio();
  const queryClient = useQueryClient();
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFamiglia, setSelectedFamiglia] = useState<any>(null);
  const [selectedInvitato, setSelectedInvitato] = useState<any>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);

  // Fetch families with their members
  const { data: famiglie = [], isLoading: isLoadingFamiglie } = useQuery({
    queryKey: ["famiglie", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];

      const { data, error } = await supabase
        .from("famiglie")
        .select(
          `
          *,
          invitati(
            *,
            famiglia:famiglie!invitati_famiglia_id_fkey(id, nome)
          )
        `
        )
        .eq("wedding_id", wedding.id)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    enabled: !!wedding?.id,
  });

  const deleteFamigliaMutation = useMutation({
    mutationFn: async (famigliaId: string) => {
      // Set famiglia_id to NULL for all members
      await supabase
        .from("invitati")
        .update({ famiglia_id: null, is_capo_famiglia: false })
        .eq("famiglia_id", famigliaId);

      // Delete famiglia
      const { error } = await supabase
        .from("famiglie")
        .delete()
        .eq("id", famigliaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["famiglie"] });
      queryClient.invalidateQueries({ queryKey: ["invitati"] });
      toast.success("Famiglia eliminata con successo");
      setShowDeleteDialog(false);
      setSelectedFamiglia(null);
    },
    onError: (error: any) => {
      toast.error("Errore durante l'eliminazione della famiglia");
      console.error(error);
    },
  });

  const toggleFamily = (famigliaId: string) => {
    setExpandedFamilies((prev) =>
      prev.includes(famigliaId)
        ? prev.filter((id) => id !== famigliaId)
        : [...prev, famigliaId]
    );
  };

  const openDeleteConfirm = (famiglia: any) => {
    setSelectedFamiglia(famiglia);
    setShowDeleteDialog(true);
  };

  const handleDeleteFamiglia = () => {
    if (selectedFamiglia) {
      deleteFamigliaMutation.mutate(selectedFamiglia.id);
    }
  };

  const openEditInvitatoPanel = (invitato: any) => {
    setSelectedInvitato(invitato);
    setShowEditSheet(true);
  };

  // Calculate statistics
  const totalFamiglie = famiglie.length;

  const famiglieRisposto = famiglie.filter((famiglia) => {
    const membri = famiglia.invitati || [];
    return (
      membri.length > 0 && membri.every((m: any) => m.rsvp_status !== "In attesa")
    );
  });

  const famiglieRisposteParziali = famiglie.filter((famiglia) => {
    const membri = famiglia.invitati || [];
    const hasResponse = membri.some((m: any) => m.rsvp_status !== "In attesa");
    const allResponded = membri.every((m: any) => m.rsvp_status !== "In attesa");
    return hasResponse && !allResponded;
  });

  const famiglieNessunaRisposta = famiglie.filter((famiglia) => {
    const membri = famiglia.invitati || [];
    return (
      membri.length > 0 && membri.every((m: any) => m.rsvp_status === "In attesa")
    );
  });

  if (isLoadingWedding || isLoadingFamiglie) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-6 h-32 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Nessun matrimonio selezionato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                Famiglie
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                Gestisci le famiglie e i loro membri
              </p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Aggiungi Famiglia</span>
          </Button>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1 - Famiglie Totali */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Famiglie Totali
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {totalFamiglie}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card 2 - Hanno Risposto */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Hanno Risposto
                </p>
                <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {famiglieRisposto.length}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-green-600">
                    ({totalFamiglie > 0
                      ? Math.round((famiglieRisposto.length / totalFamiglie) * 100)
                      : 0}
                    %)
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 sm:mt-2 truncate">
              Tutti i membri hanno risposto
            </p>
          </div>

          {/* Card 3 - Risposte Parziali */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Risposte Parziali
                </p>
                <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {famiglieRisposteParziali.length}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-yellow-600">
                    ({totalFamiglie > 0
                      ? Math.round(
                          (famiglieRisposteParziali.length / totalFamiglie) * 100
                        )
                      : 0}
                    %)
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 sm:mt-2 truncate">
              Almeno un membro ha risposto
            </p>
          </div>

          {/* Card 4 - Nessuna Risposta */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Nessuna Risposta
                </p>
                <div className="flex items-baseline gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {famiglieNessunaRisposta.length}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-red-600">
                    ({totalFamiglie > 0
                      ? Math.round(
                          (famiglieNessunaRisposta.length / totalFamiglie) * 100
                        )
                      : 0}
                    %)
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 sm:mt-2 truncate">
              Nessun membro ha risposto
            </p>
          </div>
        </div>

        {/* Family List with Collapsible Tables */}
        {famiglie.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna famiglia
            </h3>
            <p className="text-sm text-gray-500">
              Inizia aggiungendo la prima famiglia
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {famiglie.map((famiglia: any) => {
              const membri = famiglia.invitati || [];
              const numeroMembri = membri.length;

              // Calculate status
              const allResponded = membri.every(
                (m: any) => m.rsvp_status !== "In attesa"
              );
              const someResponded = membri.some(
                (m: any) => m.rsvp_status !== "In attesa"
              );
              const noneResponded = membri.every(
                (m: any) => m.rsvp_status === "In attesa"
              );
              
              // Check if family has a capo famiglia
              const hasCapoFamiglia = membri.some((m: any) => m.is_capo_famiglia);

              let badgeStatus = "Nessuna risposta";
              let badgeColor = "bg-red-100 text-red-800";

              if (allResponded && numeroMembri > 0) {
                badgeStatus = "Risposto";
                badgeColor = "bg-green-100 text-green-800";
              } else if (someResponded) {
                badgeStatus = "Risposte parziali";
                badgeColor = "bg-yellow-100 text-yellow-800";
              }

              return (
                <Collapsible
                  key={famiglia.id}
                  open={expandedFamilies.includes(famiglia.id)}
                  onOpenChange={() => toggleFamily(famiglia.id)}
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Family Header */}
                    <CollapsibleTrigger asChild>
                      <div className="p-5 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Expand Icon */}
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 text-gray-400 transition-transform",
                                expandedFamilies.includes(famiglia.id) &&
                                  "rotate-180"
                              )}
                            />

                            {/* Family Info */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                  {famiglia.nome}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {numeroMembri}{" "}
                                  {numeroMembri === 1 ? "ospite" : "ospiti"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge and Actions */}
                          <div className="flex items-center gap-3">
                            <Badge
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                badgeColor
                              )}
                            >
                              {badgeStatus}
                            </Badge>
                            
                            {!hasCapoFamiglia && numeroMembri > 0 && (
                              <Badge
                                variant="outline"
                                className="rounded-full px-3 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 border-yellow-300"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Nessun capofamiglia
                              </Badge>
                            )}

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info("Funzionalità in arrivo");
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(famiglia);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Collapsible Content - Guest Table */}
                    <CollapsibleContent>
                      <div className="border-t border-gray-200">
                        {membri.length === 0 ? (
                          <div className="p-8 text-center">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                              Nessun membro in questa famiglia
                            </p>
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nome
                                </th>
                                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Cognome
                                </th>
                                <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Cellulare
                                </th>
                                <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Tipo
                                </th>
                                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  RSVP
                                </th>
                                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Ruolo
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {membri.map((membro: any) => (
                                <tr
                                  key={membro.id}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => openEditInvitatoPanel(membro)}
                                >
                                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                                      {membro.nome}
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <div className="text-xs sm:text-sm text-gray-900">
                                      {membro.cognome}
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <a
                                      href={`https://wa.me/${membro.cellulare.replace(
                                        /[^0-9+]/g,
                                        ""
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="h-3 w-3 shrink-0" />
                                      <span>{membro.cellulare}</span>
                                    </a>
                                  </td>
                                  <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <div className="text-xs sm:text-sm text-gray-700">
                                      {membro.tipo_ospite}
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    <Badge
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center shrink-0",
                                        membro.rsvp_status === "Ci sarò" &&
                                          "bg-green-100 text-green-800",
                                        membro.rsvp_status === "In attesa" &&
                                          "bg-yellow-100 text-yellow-800",
                                        membro.rsvp_status === "Non ci sarò" &&
                                          "bg-red-100 text-red-800"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full mr-1",
                                          membro.rsvp_status === "Ci sarò" &&
                                            "bg-green-500",
                                          membro.rsvp_status === "In attesa" &&
                                            "bg-yellow-500",
                                          membro.rsvp_status === "Non ci sarò" &&
                                            "bg-red-500"
                                        )}
                                      />
                                      {membro.rsvp_status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                    {membro.is_capo_famiglia && (
                                      <Badge className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center shrink-0">
                                        <Crown className="h-3 w-3 mr-1 shrink-0" />
                                        Capo
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Family Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa famiglia?</AlertDialogTitle>
            <AlertDialogDescription>
              La famiglia "{selectedFamiglia?.nome}" sarà eliminata. Gli invitati
              diventeranno "singoli" e non verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteFamiglia}
            >
              Elimina Famiglia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Guest Sheet */}
      {selectedInvitato && (
        <EditInvitatoSheet
          invitato={selectedInvitato}
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          matrimonioId={wedding.id}
        />
      )}
    </div>
  );
};

export default Famiglie;
