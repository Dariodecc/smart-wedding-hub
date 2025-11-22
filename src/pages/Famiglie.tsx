import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppStatusBadge } from "@/components/WhatsAppStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  SlidersHorizontal,
  X,
  Check,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditInvitatoSheet } from "@/components/EditInvitatoSheet";
import { useForm } from "react-hook-form";
import { useIsMobile } from "@/hooks/use-mobile";

const Famiglie = () => {
  const { wedding, isLoading: isLoadingWedding } = useCurrentMatrimonio();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFamiglia, setSelectedFamiglia] = useState<any>(null);
  const [selectedInvitato, setSelectedInvitato] = useState<any>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    senzaCapo: 'all', // 'all' | 'con-capo' | 'senza-capo'
    stato: 'all' // 'all' | 'risposto' | 'parziale' | 'nessuna'
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  // Edit form
  const editForm = useForm({
    defaultValues: {
      nome: ''
    }
  });

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
            whatsapp_message_status,
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
      // Step 1: Set famiglia_id to NULL for all members
      const { error: updateError } = await supabase
        .from("invitati")
        .update({ famiglia_id: null, is_capo_famiglia: false })
        .eq("famiglia_id", famigliaId);

      if (updateError) throw updateError;

      // Step 2: Delete famiglia
      const { error: deleteError } = await supabase
        .from("famiglie")
        .delete()
        .eq("id", famigliaId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["famiglie", wedding?.id] });
      queryClient.invalidateQueries({ queryKey: ["invitati", wedding?.id] });
      toast.success("Famiglia eliminata con successo", {
        description: "Gli invitati sono ora singoli",
        position: isMobile ? "top-center" : "bottom-right"
      });
      setShowDeleteDialog(false);
      setSelectedFamiglia(null);
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast.error("Errore nell'eliminare la famiglia", {
        position: isMobile ? "top-center" : "bottom-right"
      });
      console.error(error);
      setIsDeleting(false);
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
      setIsDeleting(true);
      deleteFamigliaMutation.mutate(selectedFamiglia.id);
    }
  };

  const openEditInvitatoPanel = (invitato: any) => {
    setSelectedInvitato(invitato);
    setShowEditSheet(true);
  };

  const handleEditSave = async (data: { nome: string }) => {
    if (!selectedFamiglia) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('famiglie')
        .update({
          nome: data.nome.trim()
        })
        .eq('id', selectedFamiglia.id);
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['famiglie', wedding?.id] });
      await queryClient.invalidateQueries({ queryKey: ['invitati', wedding?.id] });
      
      toast.success('Famiglia aggiornata con successo', {
        position: isMobile ? 'top-center' : 'bottom-right'
      });
      
      setShowEditDialog(false);
      setSelectedFamiglia(null);
      editForm.reset();
    } catch (error) {
      console.error('Error updating famiglia:', error);
      toast.error('Errore nell\'aggiornare la famiglia', {
        position: isMobile ? 'top-center' : 'bottom-right'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Sync tempFilters when opening mobile panel
  useEffect(() => {
    if (showMobileFilters) {
      setTempFilters(filters);
    }
  }, [showMobileFilters, filters]);

  // Reset edit form when famiglia changes
  useEffect(() => {
    if (selectedFamiglia && showEditDialog) {
      editForm.reset({
        nome: selectedFamiglia.nome
      });
    }
  }, [selectedFamiglia, showEditDialog, editForm]);

  // Filter logic
  const filteredFamiglie = useMemo(() => {
    let filtered = [...famiglie];
    
    // Search filter (nome famiglia)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(fam => 
        fam.nome.toLowerCase().includes(searchLower)
      );
    }
    
    // Senza Capo Famiglia filter
    if (filters.senzaCapo === 'con-capo') {
      filtered = filtered.filter(fam => {
        const membri = fam.invitati || [];
        return membri.some((m: any) => m.is_capo_famiglia);
      });
    } else if (filters.senzaCapo === 'senza-capo') {
      filtered = filtered.filter(fam => {
        const membri = fam.invitati || [];
        return !membri.some((m: any) => m.is_capo_famiglia);
      });
    }
    
    // Stato filter
    if (filters.stato !== 'all') {
      filtered = filtered.filter(fam => {
        const membri = fam.invitati || [];
        if (membri.length === 0) return false;
        
        const allResponded = membri.every((m: any) => m.rsvp_status !== "In attesa");
        const someResponded = membri.some((m: any) => m.rsvp_status !== "In attesa");
        const noneResponded = membri.every((m: any) => m.rsvp_status === "In attesa");
        
        if (filters.stato === 'risposto') return allResponded;
        if (filters.stato === 'parziale') return someResponded && !allResponded;
        if (filters.stato === 'nessuna') return noneResponded;
        
        return true;
      });
    }
    
    return filtered;
  }, [famiglie, filters]);

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

        {/* Filters Section */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            {/* Mobile Filter Button */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-700">
                Famiglie ({filteredFamiglie.length})
              </h3>
              
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden border-gray-200 rounded-lg h-9 w-9 p-0"
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-3 flex-1 justify-end">
              {/* Search */}
              <div className="relative w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca famiglia..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9 h-10 border-gray-200 rounded-lg"
                />
              </div>
              
              {/* Capo Famiglia Filter */}
              <Select
                value={filters.senzaCapo}
                onValueChange={(value) => setFilters(prev => ({ ...prev, senzaCapo: value }))}
              >
                <SelectTrigger className="w-[180px] h-10 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Capo famiglia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le famiglie</SelectItem>
                  <SelectItem value="con-capo">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-yellow-600" />
                      Con capo famiglia
                    </div>
                  </SelectItem>
                  <SelectItem value="senza-capo">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                      Senza capo famiglia
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Stato Filter */}
              <Select
                value={filters.stato}
                onValueChange={(value) => setFilters(prev => ({ ...prev, stato: value }))}
              >
                <SelectTrigger className="w-[180px] h-10 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Stato risposta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="risposto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Hanno risposto
                    </div>
                  </SelectItem>
                  <SelectItem value="parziale">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Risposte parziali
                    </div>
                  </SelectItem>
                  <SelectItem value="nessuna">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Nessuna risposta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Clear Filters Button */}
              {(filters.search || filters.senzaCapo !== 'all' || filters.stato !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => setFilters({ search: '', senzaCapo: 'all', stato: 'all' })}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancella
                </Button>
              )}
              
              {/* Active Filters Count */}
              {(filters.search || filters.senzaCapo !== 'all' || filters.stato !== 'all') && (
                <Badge className="bg-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-xs font-medium">
                  {[
                    filters.search ? 1 : 0,
                    filters.senzaCapo !== 'all' ? 1 : 0,
                    filters.stato !== 'all' ? 1 : 0
                  ].reduce((a, b) => a + b, 0)} filtri attivi
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Notice */}
        {(filters.search || filters.senzaCapo !== 'all' || filters.stato !== 'all') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-900">
              Stai visualizzando <strong>{filteredFamiglie.length}</strong> di <strong>{famiglie.length}</strong> famiglie totali
            </p>
          </div>
        )}

        {/* Family List with Collapsible Tables */}
        {filteredFamiglie.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Nessuna famiglia trovata
            </h3>
            <p className="text-sm text-gray-500">
              {famiglie.length === 0 
                ? "Inizia aggiungendo la prima famiglia"
                : "Prova a modificare i filtri di ricerca"
              }
            </p>
            {(filters.search || filters.senzaCapo !== 'all' || filters.stato !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFilters({ search: '', senzaCapo: 'all', stato: 'all' })}
              >
                <X className="h-4 w-4 mr-2" />
                Cancella filtri
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFamiglie.map((famiglia: any) => {
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
                                  setSelectedFamiglia(famiglia);
                                  setShowEditDialog(true);
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                                        {membro.nome}
                                      </div>
                                      <WhatsAppStatusBadge status={membro.whatsapp_message_status} />
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
        <AlertDialogContent className={isMobile ? "w-[calc(100vw-2rem)] max-w-md" : "max-w-md"}>
          <AlertDialogHeader className={isMobile ? "space-y-3" : ""}>
            <AlertDialogTitle className={isMobile ? "text-lg" : "text-xl"}>
              Eliminare questa famiglia?
            </AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? "text-base leading-relaxed" : "text-base"}>
              La famiglia <strong>"{selectedFamiglia?.nome}"</strong> sarà eliminata.
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Gli invitati NON verranno eliminati
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  I {selectedFamiglia?.invitati?.length || 0} membri diventeranno "invitati singoli"
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "flex-col gap-2 sm:flex-row" : ""}>
            <AlertDialogCancel
              className={isMobile ? "h-12 w-full sm:w-auto" : ""}
              disabled={isDeleting}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                isMobile
                  ? "h-12 w-full sm:w-auto bg-red-600 hover:bg-red-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={handleDeleteFamiglia}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Famiglia
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Family Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className={cn(
          "p-0",
          isMobile ? "w-full h-full max-w-full rounded-none" : "sm:max-w-[500px]"
        )}>
          {/* Header */}
          <DialogHeader className={cn(
            "border-b border-gray-200",
            isMobile ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className={cn(
                  "font-bold text-gray-900",
                  isMobile ? "text-lg" : "text-xl"
                )}>
                  Modifica Famiglia
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  Aggiorna i dettagli della famiglia
                </DialogDescription>
              </div>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEditDialog(false)}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {/* Form - Scrollable on mobile */}
          <div className={cn(
            isMobile ? "flex-1 overflow-y-auto" : ""
          )}>
            <form 
              onSubmit={editForm.handleSubmit(handleEditSave)} 
              className={cn(
                isMobile ? "px-4 py-6 pb-24" : "px-6 py-6"
              )}
            >
              <div className="space-y-4">
                {/* Nome Famiglia */}
                <div className="space-y-2">
                  <Label htmlFor="nome-famiglia" className="text-sm font-medium text-gray-700">
                    Nome Famiglia *
                  </Label>
                  <Input
                    id="nome-famiglia"
                    {...editForm.register('nome', {
                      required: 'Il nome della famiglia è obbligatorio',
                      minLength: {
                        value: 2,
                        message: 'Il nome deve essere di almeno 2 caratteri'
                      }
                    })}
                    placeholder="es. Famiglia Rossi"
                    className="h-10 border-gray-200 rounded-lg"
                  />
                  {editForm.formState.errors.nome && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {editForm.formState.errors.nome.message}
                    </p>
                  )}
                </div>
                
                {/* Family Info */}
                {selectedFamiglia && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Membri totali:</span>
                        <span className="font-medium text-gray-900">
                          {selectedFamiglia.invitati?.length || 0}
                        </span>
                      </div>
                      {selectedFamiglia.invitati?.some((m: any) => m.is_capo_famiglia) && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Capo famiglia:</span>
                          <div className="flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-yellow-600" />
                            <span className="font-medium text-gray-900">
                              {selectedFamiglia.invitati.find((m: any) => m.is_capo_famiglia)?.nome}{' '}
                              {selectedFamiglia.invitati.find((m: any) => m.is_capo_famiglia)?.cognome}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
          
          {/* Footer - Sticky on mobile */}
          <DialogFooter className={cn(
            "border-t border-gray-200 bg-gray-50",
            isMobile ? "sticky bottom-0 px-4 py-4" : "px-6 py-4"
          )}>
            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSaving}
                className={cn(
                  isMobile ? "flex-1 h-12" : ""
                )}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                onClick={editForm.handleSubmit(handleEditSave)}
                disabled={isSaving}
                className={cn(
                  "bg-blue-600 hover:bg-blue-700 text-white",
                  isMobile ? "flex-1 h-12" : ""
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Salva
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Filter Panel */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent
          side="right"
          className="w-full h-full p-0 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Filtri Famiglie
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Filtra le famiglie per trovare ciò che cerchi
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowMobileFilters(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Filter Form */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
            <div className="space-y-6 pb-24">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">
                  Cerca Famiglia
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Nome famiglia..."
                    value={tempFilters.search}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 h-12 text-base border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              
              <Separator className="bg-gray-200" />
              
              {/* Capo Famiglia */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">
                  Capo Famiglia
                </Label>
                <Select
                  value={tempFilters.senzaCapo}
                  onValueChange={(value) => setTempFilters(prev => ({ ...prev, senzaCapo: value }))}
                >
                  <SelectTrigger className="h-12 text-base border-gray-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="h-12 text-base">
                      Tutte le famiglie
                    </SelectItem>
                    <SelectItem value="con-capo" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        Con capo famiglia
                      </div>
                    </SelectItem>
                    <SelectItem value="senza-capo" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Senza capo famiglia
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Filtra famiglie con o senza un capo famiglia designato
                </p>
              </div>
              
              <Separator className="bg-gray-200" />
              
              {/* Stato */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">
                  Stato Risposta
                </Label>
                <Select
                  value={tempFilters.stato}
                  onValueChange={(value) => setTempFilters(prev => ({ ...prev, stato: value }))}
                >
                  <SelectTrigger className="h-12 text-base border-gray-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="h-12 text-base">
                      Tutti gli stati
                    </SelectItem>
                    <SelectItem value="risposto" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Hanno risposto
                      </div>
                    </SelectItem>
                    <SelectItem value="parziale" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Risposte parziali
                      </div>
                    </SelectItem>
                    <SelectItem value="nessuna" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Nessuna risposta
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Filtra in base allo stato di risposta dei membri della famiglia
                </p>
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-900">
                    <p className="font-medium mb-1">Come funzionano i filtri:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>Hanno risposto</strong>: Tutti i membri hanno risposto</li>
                      <li><strong>Risposte parziali</strong>: Alcuni membri hanno risposto</li>
                      <li><strong>Nessuna risposta</strong>: Nessun membro ha risposto</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 border-gray-200 rounded-lg"
                onClick={() => {
                  setTempFilters({ search: '', senzaCapo: 'all', stato: 'all' });
                  setFilters({ search: '', senzaCapo: 'all', stato: 'all' });
                  setShowMobileFilters(false);
                }}
              >
                <X className="h-5 w-5 mr-2" />
                Cancella Filtri
              </Button>
              <Button
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                onClick={() => {
                  setFilters(tempFilters);
                  setShowMobileFilters(false);
                }}
              >
                <Check className="h-5 w-5 mr-2" />
                Applica
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
