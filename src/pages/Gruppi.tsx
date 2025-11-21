import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Layers, Users, CheckCircle, Clock, XCircle, Pencil, Trash2, AlertCircle, Check, X, Loader2, Info, Search, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useIsMobile } from "@/hooks/use-mobile";
const AVAILABLE_COLORS = [{
  hex: '#3B82F6',
  name: 'Blu'
}, {
  hex: '#EF4444',
  name: 'Rosso'
}, {
  hex: '#10B981',
  name: 'Verde'
}, {
  hex: '#F59E0B',
  name: 'Arancione'
}, {
  hex: '#8B5CF6',
  name: 'Viola'
}, {
  hex: '#F97316',
  name: 'Arancio'
}, {
  hex: '#06B6D4',
  name: 'Ciano'
}, {
  hex: '#84CC16',
  name: 'Lime'
}, {
  hex: '#EC4899',
  name: 'Rosa'
}, {
  hex: '#6B7280',
  name: 'Grigio'
}];
const Gruppi = () => {
  const {
    wedding,
    isLoading: isLoadingWedding
  } = useCurrentMatrimonio();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManageMembersDialog, setShowManageMembersDialog] = useState(false);
  const [selectedGruppo, setSelectedGruppo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const createForm = useForm({
    defaultValues: {
      nome: '',
      colore: '#3B82F6'
    }
  });
  const editForm = useForm({
    defaultValues: {
      nome: '',
      colore: '#3B82F6'
    }
  });

  // Fetch groups with their members
  const {
    data: gruppi = [],
    isLoading: isLoadingGruppi
  } = useQuery({
    queryKey: ["gruppi", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const {
        data,
        error
      } = await supabase.from("gruppi").select(`
          *,
          invitati(
            id,
            nome,
            cognome,
            rsvp_status
          )
        `).eq("wedding_id", wedding.id).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!wedding?.id
  });

  // Fetch guests for members management
  const {
    data: allGuests = []
  } = useQuery({
    queryKey: ['invitati-for-group', wedding?.id, selectedGruppo?.id],
    queryFn: async () => {
      if (!wedding?.id || !selectedGruppo?.id) return [];
      const {
        data,
        error
      } = await supabase.from('invitati').select('*').eq('wedding_id', wedding.id).or(`gruppo_id.is.null,gruppo_id.eq.${selectedGruppo.id}`).order('cognome').order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: showManageMembersDialog && !!wedding?.id && !!selectedGruppo?.id
  });

  // Filter guests by search query
  const filteredGuests = useMemo(() => {
    if (!memberSearchQuery) return allGuests;
    const query = memberSearchQuery.toLowerCase();
    return allGuests.filter(guest => guest.nome.toLowerCase().includes(query) || guest.cognome.toLowerCase().includes(query));
  }, [allGuests, memberSearchQuery]);

  // Filter groups by search query
  const filteredGruppi = useMemo(() => {
    if (!searchQuery) return gruppi;
    const query = searchQuery.toLowerCase();
    return gruppi.filter(gruppo => gruppo.nome.toLowerCase().includes(query));
  }, [gruppi, searchQuery]);
  const handleCreateGroup = async (data: {
    nome: string;
    colore: string;
  }) => {
    try {
      setIsLoading(true);
      const {
        error
      } = await supabase.from("gruppi").insert({
        nome: data.nome.trim(),
        colore: data.colore,
        wedding_id: wedding?.id
      });
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["gruppi", wedding?.id]
      });
      toast.success("Gruppo creato con successo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
      setShowCreateDialog(false);
      createForm.reset();
    } catch (error) {
      console.error("Error creating gruppo:", error);
      toast.error("Errore nella creazione del gruppo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const openEditDialog = (gruppo: any) => {
    setSelectedGruppo(gruppo);
    editForm.reset({
      nome: gruppo.nome,
      colore: gruppo.colore
    });
    setShowEditDialog(true);
  };
  const handleEditGroup = async (data: {
    nome: string;
    colore: string;
  }) => {
    try {
      setIsLoading(true);
      const {
        error
      } = await supabase.from("gruppi").update({
        nome: data.nome.trim(),
        colore: data.colore
      }).eq("id", selectedGruppo.id);
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["gruppi", wedding?.id]
      });
      toast.success("Gruppo aggiornato con successo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
      setShowEditDialog(false);
      setSelectedGruppo(null);
    } catch (error) {
      console.error("Error updating gruppo:", error);
      toast.error("Errore nell'aggiornare il gruppo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const openDeleteConfirm = (gruppo: any) => {
    setSelectedGruppo(gruppo);
    setShowDeleteDialog(true);
  };
  const handleDeleteGruppo = async () => {
    try {
      setIsDeleting(true);

      // Set gruppo_id to NULL for all members
      const {
        error: updateError
      } = await supabase.from("invitati").update({
        gruppo_id: null
      }).eq("gruppo_id", selectedGruppo.id);
      if (updateError) throw updateError;

      // Delete gruppo
      const {
        error: deleteError
      } = await supabase.from("gruppi").delete().eq("id", selectedGruppo.id);
      if (deleteError) throw deleteError;
      await queryClient.invalidateQueries({
        queryKey: ["gruppi", wedding?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["invitati", wedding?.id]
      });
      toast.success("Gruppo eliminato con successo", {
        description: "Gli invitati non sono stati eliminati",
        position: isMobile ? "top-center" : "bottom-right"
      });
      setShowDeleteDialog(false);
      setSelectedGruppo(null);
    } catch (error) {
      console.error("Error deleting gruppo:", error);
      toast.error("Errore nell'eliminare il gruppo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleSaveMembers = async () => {
    if (!selectedGruppo) return;
    try {
      setIsLoading(true);

      // Step 1: Remove all current members from this group
      const {
        error: removeError
      } = await supabase.from('invitati').update({
        gruppo_id: null
      }).eq('gruppo_id', selectedGruppo.id);
      if (removeError) throw removeError;

      // Step 2: Add selected members to this group
      if (selectedMembers.length > 0) {
        const {
          error: addError
        } = await supabase.from('invitati').update({
          gruppo_id: selectedGruppo.id
        }).in('id', selectedMembers);
        if (addError) throw addError;
      }

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({
        queryKey: ['gruppi', wedding?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['invitati', wedding?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['invitati-for-group', wedding?.id, selectedGruppo.id]
      });
      toast.success('Ospiti del gruppo aggiornati', {
        description: `${selectedMembers.length} ospiti assegnati a ${selectedGruppo.nome}`,
        position: isMobile ? 'top-center' : 'bottom-right'
      });
      setShowManageMembersDialog(false);
      setMemberSearchQuery('');
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error updating group members:', error);
      toast.error('Errore nell\'aggiornare gli ospiti', {
        position: isMobile ? 'top-center' : 'bottom-right'
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoadingWedding || !wedding) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
              Gruppi
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              Organizza gli invitati in gruppi personalizzati
            </p>
          </div>

          {/* Add Group Button - Icon only on mobile */}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Aggiungi Gruppo</span>
          </Button>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Total Count Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Gruppi Totali
              </p>
              <p className="text-white text-3xl sm:text-4xl font-bold mt-1">
                {gruppi.length}
              </p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Group Count */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-700">
                Gruppi
              </h3>
              <Badge className="bg-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-xs font-medium">
                {filteredGruppi.length}
              </Badge>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-[300px] md:w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca gruppo per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-9 border-gray-200 rounded-lg",
                  isMobile ? "h-12 text-base" : "h-10"
                )}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Active Filter Info */}
          {searchQuery && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Stai visualizzando <strong className="text-gray-900">{filteredGruppi.length}</strong> di{' '}
                <strong className="text-gray-900">{gruppi.length}</strong> gruppi totali
              </p>
            </div>
          )}
        </div>

        {/* Groups Grid */}
        {isLoadingGruppi ? <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div> : filteredGruppi.length === 0 ?
      // Empty State
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
            
            {searchQuery ? (
              // No results from search
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun gruppo trovato
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Nessun gruppo corrisponde a "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="border-gray-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancella ricerca
                </Button>
              </>
            ) : (
              // No groups created yet
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun gruppo creato
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Inizia a organizzare i tuoi invitati creando il primo gruppo
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Primo Gruppo
                </Button>
              </>
            )}
          </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGruppi.map(gruppo => {
          const membri = gruppo.invitati || [];
          const totaleMembri = membri.length;
          const confermati = membri.filter((m: any) => m.rsvp_status === "Ci sarò").length;
          const inAttesa = membri.filter((m: any) => m.rsvp_status === "In attesa").length;
          const declinati = membri.filter((m: any) => m.rsvp_status === "Non ci sarò").length;
          return <div key={gruppo.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer" onClick={e => {
            // Don't open dialog if clicking on action buttons
            if ((e.target as HTMLElement).closest('button')) return;
            setSelectedGruppo(gruppo);
            setSelectedMembers(gruppo.invitati?.map((m: any) => m.id) || []);
            setShowManageMembersDialog(true);
          }}>
                  {/* Color Header */}
                  <div className="h-2" style={{
              backgroundColor: gruppo.colore
            }} />

                  {/* Card Content */}
                  <div className="p-5">
                    {/* Header with Nome and Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                    backgroundColor: `${gruppo.colore}20`
                  }}>
                          <Layers className="h-5 w-5" style={{
                      color: gruppo.colore
                    }} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {gruppo.nome}
                        </h3>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={e => {
                    e.stopPropagation();
                    openEditDialog(gruppo);
                  }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={e => {
                    e.stopPropagation();
                    openDeleteConfirm(gruppo);
                  }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="space-y-3 mb-4">
                      {/* Total Members */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            Totale Invitati
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{totaleMembri}</span>
                      </div>

                      {/* RSVP Stats Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Confermati */}
                        <div className="p-2 bg-green-50 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <p className="text-xl font-bold text-green-900">{confermati}</p>
                          <p className="text-xs text-green-700">Confermati</p>
                        </div>

                        {/* In Attesa */}
                        <div className="p-2 bg-yellow-50 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="h-3.5 w-3.5 text-yellow-600" />
                          </div>
                          <p className="text-xl font-bold text-yellow-900">{inAttesa}</p>
                          <p className="text-xs text-yellow-700">In Attesa</p>
                        </div>

                        {/* Declinati */}
                        <div className="p-2 bg-red-50 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                          </div>
                          <p className="text-xl font-bold text-red-900">{declinati}</p>
                          <p className="text-xs text-red-700">Declinati</p>
                        </div>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Ospiti del Gruppo
                      </p>
                      {totaleMembri === 0 ? <p className="text-sm text-gray-400 italic">
                          Nessun invitato associato
                        </p> : <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                          {membri.map((membro: any) => <div key={membro.id} className="flex items-center justify-between py-1 text-sm">
                              <span className="text-gray-700 truncate">
                                {membro.nome} {membro.cognome}
                              </span>
                              <div className={cn("w-2 h-2 rounded-full shrink-0 ml-2", membro.rsvp_status === "Ci sarò" && "bg-green-500", membro.rsvp_status === "In attesa" && "bg-yellow-500", membro.rsvp_status === "Non ci sarò" && "bg-red-500")} />
                            </div>)}
                        </div>}
                    </div>
                  </div>
                </div>;
        })}
          </div>}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={cn("p-0", isMobile ? "w-full h-full max-w-full rounded-none" : "sm:max-w-[500px]")}>
          {/* Header */}
          <DialogHeader className={cn("border-b border-gray-200", isMobile ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4")}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className={cn("font-bold text-gray-900", isMobile ? "text-lg" : "text-xl")}>
                  Crea Nuovo Gruppo
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  Organizza gli invitati in gruppi personalizzati
                </DialogDescription>
              </div>
              {isMobile && <Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(false)} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>}
            </div>
          </DialogHeader>

          {/* Form */}
          <div className={cn(isMobile ? "flex-1 overflow-y-auto" : "")}>
            <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className={cn(isMobile ? "px-4 py-6 pb-24" : "px-6 py-6")}>
              <div className="space-y-6">
                {/* Nome Gruppo */}
                <div className="space-y-2">
                  <Label htmlFor="nome-gruppo" className={cn("font-medium text-gray-700", isMobile ? "text-base" : "text-sm")}>
                    Nome del Gruppo *
                  </Label>
                  <Input id="nome-gruppo" {...createForm.register("nome", {
                  required: "Il nome del gruppo è obbligatorio",
                  minLength: {
                    value: 2,
                    message: "Il nome deve essere di almeno 2 caratteri"
                  }
                })} placeholder="es. Amici di scuola, Colleghi, Famiglia..." className={cn("border-gray-200 rounded-lg", isMobile ? "h-12 text-base" : "h-10")} />
                  {createForm.formState.errors.nome && <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {createForm.formState.errors.nome.message}
                    </p>}
                </div>

                {/* Colore del Gruppo */}
                <div className="space-y-3">
                  <Label className={cn("font-medium text-gray-700", isMobile ? "text-base" : "text-sm")}>
                    Colore del Gruppo
                  </Label>
                  <div className="grid grid-cols-5 gap-3">
                    {AVAILABLE_COLORS.map(color => <button key={color.hex} type="button" onClick={() => createForm.setValue("colore", color.hex)} className={cn("relative rounded-xl transition-all", isMobile ? "w-14 h-14" : "w-12 h-12", createForm.watch("colore") === color.hex ? "ring-4 ring-offset-2 scale-110" : "hover:scale-105")} style={{
                    backgroundColor: color.hex,
                    ...(createForm.watch("colore") === color.hex && {
                      boxShadow: `0 0 0 4px ${color.hex}40`
                    })
                  }} title={color.name}>
                        {createForm.watch("colore") === color.hex && <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>}
                      </button>)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Seleziona un colore per identificare facilmente il gruppo
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <DialogFooter className={cn("border-t border-gray-200 bg-gray-50", isMobile ? "sticky bottom-0 px-4 py-4" : "px-6 py-4")}>
            <div className="flex items-center gap-3 w-full">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isLoading} className={cn(isMobile ? "flex-1 h-12" : "")}>
                Annulla
              </Button>
              <Button type="submit" onClick={createForm.handleSubmit(handleCreateGroup)} disabled={isLoading} className={cn("bg-blue-600 hover:bg-blue-700 text-white", isMobile ? "flex-1 h-12" : "")}>
                {isLoading ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando...
                  </> : <>
                    <Check className="h-4 w-4 mr-2" />
                    Crea Gruppo
                  </>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className={cn("p-0", isMobile ? "w-full h-full max-w-full rounded-none" : "sm:max-w-[500px]")}>
          <DialogHeader className={cn("border-b border-gray-200", isMobile ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4")}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className={cn("font-bold text-gray-900", isMobile ? "text-lg" : "text-xl")}>
                  Modifica Gruppo
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  Aggiorna le informazioni del gruppo
                </DialogDescription>
              </div>
              {isMobile && <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(false)} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>}
            </div>
          </DialogHeader>

          <div className={cn(isMobile ? "flex-1 overflow-y-auto" : "")}>
            <form onSubmit={editForm.handleSubmit(handleEditGroup)} className={cn(isMobile ? "px-4 py-6 pb-24" : "px-6 py-6")}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome-gruppo" className={cn("font-medium text-gray-700", isMobile ? "text-base" : "text-sm")}>
                    Nome del Gruppo *
                  </Label>
                  <Input id="edit-nome-gruppo" {...editForm.register("nome", {
                  required: "Il nome del gruppo è obbligatorio",
                  minLength: {
                    value: 2,
                    message: "Il nome deve essere di almeno 2 caratteri"
                  }
                })} placeholder="es. Amici di scuola, Colleghi, Famiglia..." className={cn("border-gray-200 rounded-lg", isMobile ? "h-12 text-base" : "h-10")} />
                  {editForm.formState.errors.nome && <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {editForm.formState.errors.nome.message}
                    </p>}
                </div>

                <div className="space-y-3">
                  <Label className={cn("font-medium text-gray-700", isMobile ? "text-base" : "text-sm")}>
                    Colore del Gruppo
                  </Label>
                  <div className="grid grid-cols-5 gap-3">
                    {AVAILABLE_COLORS.map(color => <button key={color.hex} type="button" onClick={() => editForm.setValue("colore", color.hex)} className={cn("relative rounded-xl transition-all", isMobile ? "w-14 h-14" : "w-12 h-12", editForm.watch("colore") === color.hex ? "ring-4 ring-offset-2 scale-110" : "hover:scale-105")} style={{
                    backgroundColor: color.hex,
                    ...(editForm.watch("colore") === color.hex && {
                      boxShadow: `0 0 0 4px ${color.hex}40`
                    })
                  }} title={color.name}>
                        {editForm.watch("colore") === color.hex && <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>}
                      </button>)}
                  </div>
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className={cn("border-t border-gray-200 bg-gray-50", isMobile ? "sticky bottom-0 px-4 py-4" : "px-6 py-4")}>
            <div className="flex items-center gap-3 w-full">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={isLoading} className={cn(isMobile ? "flex-1 h-12" : "")}>
                Annulla
              </Button>
              <Button type="submit" onClick={editForm.handleSubmit(handleEditGroup)} disabled={isLoading} className={cn("bg-blue-600 hover:bg-blue-700 text-white", isMobile ? "flex-1 h-12" : "")}>
                {isLoading ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </> : <>
                    <Check className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className={isMobile ? "w-[calc(100vw-2rem)] max-w-md" : "max-w-md"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isMobile ? "text-lg" : "text-xl"}>
              Eliminare questo gruppo?
            </AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? "text-base leading-relaxed" : "text-base"}>
              Il gruppo <strong>"{selectedGruppo?.nome}"</strong> sarà eliminato.
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Gli invitati NON verranno eliminati
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Gli invitati rimarranno nella lista senza gruppo
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "flex-col gap-2 sm:flex-row" : ""}>
            <AlertDialogCancel className={isMobile ? "h-12 w-full sm:w-auto" : ""} disabled={isDeleting}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction className={isMobile ? "h-12 w-full sm:w-auto bg-red-600 hover:bg-red-700" : "bg-red-600 hover:bg-red-700"} onClick={handleDeleteGruppo} disabled={isDeleting}>
              {isDeleting ? <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </> : <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Gruppo
                </>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Members Dialog */}
      <Dialog open={showManageMembersDialog} onOpenChange={setShowManageMembersDialog}>
        <DialogContent className={cn("p-0 max-h-[90vh] flex flex-col", isMobile ? "w-full h-full max-w-full rounded-none" : "sm:max-w-[600px]")}>
          {/* Header */}
          <DialogHeader className={cn("shrink-0 border-b border-gray-200", isMobile ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedGruppo && <div className={cn("rounded-xl flex items-center justify-center shrink-0", isMobile ? "w-12 h-12" : "w-10 h-10")} style={{
                backgroundColor: `${selectedGruppo.colore}20`
              }}>
                    <Layers className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} style={{
                  color: selectedGruppo.colore
                }} />
                  </div>}
                <div className="min-w-0 flex-1">
                  <DialogTitle className={cn("font-bold text-gray-900 truncate", isMobile ? "text-lg" : "text-xl")}>
                    {selectedGruppo?.nome}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-0.5">
                    Gestisci gli ospiti del gruppo
                  </DialogDescription>
                </div>
              </div>
              {isMobile}
            </div>
          </DialogHeader>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search and Actions Bar */}
            <div className={cn("shrink-0 border-b border-gray-200 bg-gray-50", isMobile ? "px-4 py-3 space-y-3" : "px-6 py-4")}>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Cerca ospiti..." value={memberSearchQuery} onChange={e => setMemberSearchQuery(e.target.value)} className={cn("pl-9 border-gray-200 rounded-lg bg-white", isMobile ? "h-12 text-base" : "h-10")} />
              </div>
              
              {/* Selection Summary and Actions */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{selectedMembers.length}</span> di{' '}
                  <span className="font-medium text-gray-900">{filteredGuests.length}</span> ospiti assegnati
                </p>
                
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedMembers(filteredGuests.map((g: any) => g.id))} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3">
                    Seleziona tutti
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedMembers([])} className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 h-8 px-3">
                    Deseleziona tutti
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Guest List */}
            <div className={cn("flex-1 overflow-y-auto", isMobile ? "px-4 py-3" : "px-6 py-4")}>
              {filteredGuests.length === 0 ?
            // Empty State
            <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  {memberSearchQuery ? <>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        Nessun ospite trovato
                      </h3>
                      <p className="text-sm text-gray-500">
                        Prova a modificare la ricerca
                      </p>
                    </> : <>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        Nessun ospite disponibile
                      </h3>
                      <p className="text-sm text-gray-500 max-w-xs">
                        Tutti gli ospiti sono già assegnati a questo gruppo
                      </p>
                    </>}
                </div> : <div className="space-y-2">
                  {filteredGuests.map((guest: any) => {
                const isSelected = selectedMembers.includes(guest.id);
                const isCapoFamiglia = guest.is_capo_famiglia;
                return <div key={guest.id} onClick={() => {
                  setSelectedMembers(prev => prev.includes(guest.id) ? prev.filter(id => id !== guest.id) : [...prev, guest.id]);
                }} className={cn("flex items-center gap-3 rounded-lg border-2 transition-all cursor-pointer", isMobile ? "p-4" : "p-3", isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50")}>
                        {/* Checkbox */}
                        <div className={cn("shrink-0 rounded-full border-2 flex items-center justify-center transition-all", isMobile ? "w-6 h-6" : "w-5 h-5", isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white")}>
                          {isSelected && <Check className={cn("text-white", isMobile ? "h-4 w-4" : "h-3 w-3")} />}
                        </div>
                        
                        {/* Guest Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("font-medium text-gray-900 truncate", isMobile ? "text-base" : "text-sm")}>
                              {guest.nome} {guest.cognome}
                            </p>
                            {isCapoFamiglia && <Badge className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs shrink-0">
                                <Crown className="h-3 w-3 mr-1" />
                                Capo
                              </Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className={cn("text-gray-500 truncate", isMobile ? "text-sm" : "text-xs")}>
                              RSVP: {guest.rsvp_status}
                            </p>
                            <span className="text-gray-300">•</span>
                            <p className={cn("text-gray-500", isMobile ? "text-sm" : "text-xs")}>
                              {guest.cellulare}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={cn("text-gray-600 border-gray-300", isMobile ? "text-xs" : "text-xs")}>
                              {guest.tipo_ospite}
                            </Badge>
                            {guest.famiglia_id && <Badge variant="outline" className={cn("text-purple-600 border-purple-300", isMobile ? "text-xs" : "text-xs")}>
                                <Users className="h-3 w-3 mr-1" />
                                Famiglia
                              </Badge>}
                          </div>
                        </div>
                        
                        {/* RSVP Status Indicator */}
                        <div className={cn("shrink-0 rounded-full", isMobile ? "w-3 h-3" : "w-2.5 h-2.5", guest.rsvp_status === "Ci sarò" && "bg-green-500", guest.rsvp_status === "In attesa" && "bg-yellow-500", guest.rsvp_status === "Non ci sarò" && "bg-red-500")} />
                      </div>;
              })}
                </div>}
            </div>
          </div>
          
          {/* Footer */}
          <DialogFooter className={cn("shrink-0 border-t border-gray-200 bg-white", isMobile ? "sticky bottom-0 px-4 py-4" : "px-6 py-4")}>
            <div className="flex items-center gap-3 w-full">
              <Button type="button" variant="outline" onClick={() => {
              setShowManageMembersDialog(false);
              setMemberSearchQuery('');
              setSelectedMembers([]);
            }} disabled={isLoading} className={cn(isMobile ? "flex-1 h-12" : "")}>
                Annulla
              </Button>
              <Button type="button" onClick={handleSaveMembers} disabled={isLoading} className={cn("bg-blue-600 hover:bg-blue-700 text-white", isMobile ? "flex-1 h-12" : "")}>
                {isLoading ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </> : <>
                    <Check className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Gruppi;