import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Copy, Check, Trash2, Loader2, Users, Crown, ChevronDown, AlertCircle, PlusCircle } from "lucide-react";
interface EditInvitatoSheetProps {
  invitato: any;
  isOpen: boolean;
  onClose: () => void;
  matrimonioId: string;
}
export function EditInvitatoSheet({
  invitato,
  isOpen,
  onClose,
  matrimonioId
}: EditInvitatoSheetProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedGruppo, setSelectedGruppo] = useState<any>(null);
  const [selectedTavolo, setSelectedTavolo] = useState<any>(null);

  // Famiglia state
  const [selectedFamiglia, setSelectedFamiglia] = useState<any>(invitato?.famiglia || null);
  const [isCapoFamiglia, setIsCapoFamiglia] = useState(invitato?.is_capo_famiglia || false);
  const [creaFamiglia, setCreaFamiglia] = useState(false);
  const [famigliaHasCapo, setFamigliaHasCapo] = useState(false);

  // Placeholder data - will be replaced with real data later
  const tavoli: any[] = [];

  // Fetch famiglie
  const {
    data: famiglie = []
  } = useQuery({
    queryKey: ["famiglie-select", matrimonioId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("famiglie").select("*").eq("wedding_id", matrimonioId).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Fetch gruppi
  const {
    data: gruppi = []
  } = useQuery({
    queryKey: ["gruppi-select", matrimonioId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("gruppi").select("*").eq("wedding_id", matrimonioId).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Fetch custom dietary preferences
  const DEFAULT_PREFERENCES = [
    "Vegetariano",
    "Vegano",
    "Celiaco",
    "Intollerante al lattosio",
  ];

  const { data: customPreferences = [] } = useQuery({
    queryKey: ["custom-preferences", matrimonioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preferenze_alimentari_custom")
        .select("*")
        .eq("wedding_id", matrimonioId)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Combined dietary options
  const dietaryOptions = [
    ...DEFAULT_PREFERENCES.map((pref) => ({ value: pref, label: pref })),
    ...customPreferences.map((pref) => ({ value: pref.nome, label: pref.nome })),
  ];
  const form = useForm({
    defaultValues: {
      nome: invitato?.nome || "",
      cognome: invitato?.cognome || "",
      cellulare: invitato?.cellulare || "",
      email: invitato?.email || "",
      tipo_ospite: invitato?.tipo_ospite || "Adulto",
      preferenze_alimentari: invitato?.preferenze_alimentari || [],
      rsvp_status: invitato?.rsvp_status || "In attesa",
      nomeFamiglia: ""
    }
  });
  useEffect(() => {
    if (invitato) {
      form.reset({
        nome: invitato.nome,
        cognome: invitato.cognome,
        cellulare: invitato.cellulare,
        email: invitato.email || "",
        tipo_ospite: invitato.tipo_ospite,
        preferenze_alimentari: invitato.preferenze_alimentari || [],
        rsvp_status: invitato.rsvp_status || "In attesa",
        nomeFamiglia: ""
      });
      setSelectedFamiglia(invitato.famiglia || null);
      setIsCapoFamiglia(invitato.is_capo_famiglia || false);
      setCreaFamiglia(false);
      
      // Set gruppo if exists
      if (invitato.gruppo_id && gruppi.length > 0) {
        const gruppo = gruppi.find(g => g.id === invitato.gruppo_id);
        setSelectedGruppo(gruppo || null);
      } else {
        setSelectedGruppo(null);
      }
    }
  }, [invitato, form, gruppi]);

  // Check if selected famiglia already has a capo
  const checkCapoFamiglia = async (famigliaId: string) => {
    const {
      data
    } = await supabase.from("invitati").select("id").eq("famiglia_id", famigliaId).eq("is_capo_famiglia", true).neq("id", invitato.id).single();
    setFamigliaHasCapo(!!data);
  };
  const rsvpLink = `${window.location.origin}/rsvp/${invitato?.rsvp_uuid}`;
  const copyToClipboard = () => {
    navigator.clipboard.writeText(rsvpLink);
    setCopied(true);
    toast.success("Link copiato!", {
      position: isMobile ? "top-center" : "bottom-right",
      duration: 2000
    });
    setTimeout(() => setCopied(false), 2000);
  };
  const getBadgeVariant = (status: string) => {
    if (status === "Ci sarò") return "default";
    if (status === "In attesa") return "secondary";
    return "destructive";
  };
  const getStatusColor = (status: string) => {
    if (status === "Ci sarò") return "bg-green-500";
    if (status === "In attesa") return "bg-yellow-500";
    return "bg-red-500";
  };
  const handleSave = async (data: any) => {
    // Validation: Preferenze Alimentari is required
    if (!data.preferenze_alimentari || data.preferenze_alimentari.length === 0) {
      toast.error("Seleziona almeno una preferenza alimentare", {
        position: isMobile ? "top-center" : "bottom-right"
      });
      return;
    }

    setIsLoading(true);
    try {
      let famigliaId = null;
      let shouldBeCapo = false;

      // Scenario 1: Creating new famiglia
      if (creaFamiglia && data.nomeFamiglia) {
        const {
          data: newFamiglia,
          error: famigliaError
        } = await supabase.from("famiglie").insert({
          nome: data.nomeFamiglia,
          wedding_id: matrimonioId
        }).select().single();
        if (famigliaError) throw famigliaError;
        famigliaId = newFamiglia.id;
        shouldBeCapo = true; // Auto-capo when creating famiglia
      }
      // Scenario 2: Joining existing famiglia
      else if (selectedFamiglia) {
        famigliaId = selectedFamiglia.id;
        shouldBeCapo = isCapoFamiglia;
      }
      // Scenario 3: Single guest (no famiglia)
      else {
        famigliaId = null;
        shouldBeCapo = false;
      }
      
      // Determine if guest should have RSVP link
      const shouldHaveRsvpLink = !famigliaId || shouldBeCapo;
      
      // Prepare update data
      const updateData: any = {
        nome: data.nome,
        cognome: data.cognome,
        cellulare: data.cellulare,
        email: data.email || null,
        tipo_ospite: data.tipo_ospite,
        preferenze_alimentari: data.preferenze_alimentari,
        rsvp_status: data.rsvp_status,
        famiglia_id: famigliaId,
        is_capo_famiglia: shouldBeCapo,
        gruppo_id: selectedGruppo?.id || null,
      };
      
      // Handle rsvp_uuid logic
      if (!shouldHaveRsvpLink) {
        // Remove rsvp_uuid if becoming a non-capo family member
        updateData.rsvp_uuid = null;
      } else if (!invitato.rsvp_uuid) {
        // Generate new rsvp_uuid if becoming capo or single and doesn't have one
        updateData.rsvp_uuid = crypto.randomUUID();
      }
      // If shouldHaveRsvpLink and already has rsvp_uuid, keep it (don't include in update)
      
      const {
        error
      } = await supabase.from("invitati").update(updateData).eq("id", invitato.id);
      if (error) throw error;

      // Close sheet BEFORE invalidating queries to prevent UI flickering
      onClose();
      await queryClient.invalidateQueries({
        queryKey: ["invitati", matrimonioId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["famiglie", matrimonioId]
      });
      toast.success("Modifiche salvate con successo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } catch (error) {
      console.error("Error updating invitato:", error);
      toast.error("Errore nel salvare le modifiche", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from("invitati").delete().eq("id", invitato.id);
      if (error) throw error;

      // Close sheet and dialog BEFORE invalidating queries
      setShowDeleteDialog(false);
      onClose();
      await queryClient.invalidateQueries({
        queryKey: ["invitati", matrimonioId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["famiglie", matrimonioId]
      });
      toast.success("Invitato eliminato con successo", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } catch (error) {
      console.error("Error deleting invitato:", error);
      toast.error("Errore nell'eliminare l'invitato", {
        position: isMobile ? "top-center" : "bottom-right"
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (!invitato) return null;
  return <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:w-[85vw] md:w-[45vw] lg:w-[45vw] h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {invitato.nome} {invitato.cognome}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Modifica i dettagli dell'invitato</p>
              </div>
              
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* RSVP Status Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Status RSVP</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Stato
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(form.watch("rsvp_status"))}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {form.watch("rsvp_status")}
                        </span>
                      </div>
                    </div>
                    <Select value={form.watch("rsvp_status")} onValueChange={value => form.setValue("rsvp_status", value)}>
                      <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In attesa">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            In attesa
                          </div>
                        </SelectItem>
                        <SelectItem value="Ci sarò">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Ci sarò
                          </div>
                        </SelectItem>
                        <SelectItem value="Non ci sarò">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Non ci sarò
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RSVP Link - Only show if guest should have one */}
                  {(invitato.rsvp_uuid && (!invitato.famiglia_id || invitato.is_capo_famiglia)) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Link RSVP
                      </Label>
                      <div className="flex gap-2">
                        <Input value={rsvpLink} readOnly className="flex-1 text-sm bg-gray-50 border-gray-200 text-gray-600" />
                        <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} className="h-10 w-10 border-gray-200">
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {invitato.is_capo_famiglia ? (
                        <p className="text-xs text-blue-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Questo link serve per gestire tutta la famiglia
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Condividi questo link con l'invitato per confermare la presenza
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Show info if member doesn't have link */}
                  {invitato.famiglia_id && !invitato.is_capo_famiglia && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Questo invitato è un membro della famiglia. 
                          Il capo famiglia gestisce l'RSVP per tutti.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informazioni Base Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Informazioni Base</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Nome *</Label>
                      <Input {...form.register("nome", {
                      required: true
                    })} className="h-10 bg-white border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Cognome *</Label>
                      <Input {...form.register("cognome", {
                      required: true
                    })} className="h-10 bg-white border-gray-200 rounded-lg" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Cellulare *
                    </Label>
                    <Input type="tel" {...form.register("cellulare", {
                    required: true
                  })} className="h-10 bg-white border-gray-200 rounded-lg" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input type="email" {...form.register("email")} className="h-10 bg-white border-gray-200 rounded-lg" />
                    <p className="text-xs text-gray-500">Opzionale</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Tipo Ospite *
                    </Label>
                    <Select value={form.watch("tipo_ospite")} onValueChange={value => form.setValue("tipo_ospite", value)}>
                      <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Neonato", "Bambino", "Ragazzo", "Adulto"].map(tipo => <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Preferenze Alimentari *
                    </Label>
                    <div className="space-y-3">
                      <MultiSelect
                        options={dietaryOptions}
                        selected={form.watch("preferenze_alimentari") || []}
                        onChange={(values) => form.setValue("preferenze_alimentari", values)}
                        placeholder="Seleziona preferenze alimentari"
                        className="h-10 bg-white border-gray-200 rounded-lg"
                      />
                      
                      {/* Selected items displayed below */}
                      {form.watch("preferenze_alimentari")?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {form.watch("preferenze_alimentari").map((pref: string) => (
                            <Badge
                              key={pref}
                              variant="secondary"
                              className="bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5"
                            >
                              {pref}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const current = form.watch("preferenze_alimentari") || [];
                                  form.setValue(
                                    "preferenze_alimentari",
                                    current.filter((p: string) => p !== pref)
                                  );
                                }}
                                className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {form.watch("preferenze_alimentari")?.length > 0 
                        ? `${form.watch("preferenze_alimentari").length} preferenza/e selezionata/e` 
                        : "Seleziona almeno una preferenza alimentare"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Famiglia Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Gestione Famiglia</h3>

                <div className="space-y-4">
                  {/* Associa Famiglia */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Associa Famiglia
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full h-10 justify-between border-gray-200 rounded-lg" disabled={creaFamiglia}>
                          {selectedFamiglia ? <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              {selectedFamiglia.nome}
                            </div> : <div className="flex items-center gap-2">
                              <X className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-500">Nessuna</span>
                            </div>}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca famiglia..." />
                          <CommandEmpty>Nessuna famiglia trovata</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {/* Opzione Nessuna */}
                            <CommandItem 
                              key="none" 
                              value="nessuna" 
                              onSelect={() => {
                                setSelectedFamiglia(null);
                                setIsCapoFamiglia(false);
                                setFamigliaHasCapo(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Check className={`h-4 w-4 ${!selectedFamiglia ? "opacity-100" : "opacity-0"}`} />
                                <X className="h-4 w-4 text-gray-500" />
                                <span>Nessuna</span>
                              </div>
                            </CommandItem>
                            
                            {/* Famiglie esistenti */}
                            {famiglie.map(famiglia => <CommandItem key={famiglia.id} value={famiglia.nome} onSelect={() => {
                            setSelectedFamiglia(famiglia);
                            checkCapoFamiglia(famiglia.id);
                          }}>
                                <div className="flex items-center gap-2">
                                  <Check className={`h-4 w-4 ${selectedFamiglia?.id === famiglia.id ? "opacity-100" : "opacity-0"}`} />
                                  <Users className="h-4 w-4 text-gray-500" />
                                  <span>{famiglia.nome}</span>
                                </div>
                              </CommandItem>)}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Opzionale - Seleziona una famiglia esistente
                    </p>
                  </div>

                  {/* È il Capo Famiglia */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-900">
                        È il capo famiglia
                      </Label>
                      <p className="text-xs text-gray-500">
                        Riceverà il link RSVP per tutta la famiglia
                      </p>
                    </div>
                    <Switch checked={isCapoFamiglia} onCheckedChange={checked => {
                    if (selectedFamiglia && checked) {
                      if (famigliaHasCapo) {
                        toast.error("Questa famiglia ha già un capo famiglia", {
                          position: isMobile ? "top-center" : "bottom-right"
                        });
                        return;
                      }
                    }
                    setIsCapoFamiglia(checked);
                  }} disabled={!selectedFamiglia} />
                  </div>

                  {!selectedFamiglia && !creaFamiglia && <p className="text-xs text-yellow-600 flex items-center gap-1 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                      <AlertCircle className="h-3 w-3" />
                      Seleziona prima una famiglia per abilitare questa opzione
                    </p>}

                  {selectedFamiglia && isCapoFamiglia && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-900 font-medium">
                        <Crown className="h-4 w-4" />
                        <span>Questo invitato sarà il capo famiglia</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Riceverà un link RSVP univoco per gestire tutta la famiglia
                      </p>
                    </div>}

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Oppure</span>
                    </div>
                  </div>

                  {/* Crea Nuova Famiglia */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-900">
                        Crea una nuova famiglia
                      </Label>
                      <p className="text-xs text-gray-500">
                        Crea una nuova famiglia e assegna questo invitato come capo
                      </p>
                    </div>
                    <Switch checked={creaFamiglia} onCheckedChange={checked => {
                    setCreaFamiglia(checked);
                    if (checked) {
                      setSelectedFamiglia(null);
                      setIsCapoFamiglia(false);
                    } else {
                      form.setValue("nomeFamiglia", "");
                    }
                  }} />
                  </div>

                  {creaFamiglia && <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-900 font-medium">
                        <PlusCircle className="h-4 w-4" />
                        Nuova Famiglia
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                          Nome Nuova Famiglia *
                        </Label>
                        <Input {...form.register("nomeFamiglia", {
                      required: creaFamiglia ? "Il nome della famiglia è obbligatorio" : false
                    })} placeholder="es. Famiglia Rossi" className="h-10 bg-white border-gray-200 rounded-lg" />
                        {form.formState.errors.nomeFamiglia && <p className="text-xs text-red-600">
                            {form.formState.errors.nomeFamiglia.message}
                          </p>}
                        <p className="text-xs text-green-700">
                          Questo invitato diventerà automaticamente il capo famiglia
                        </p>
                      </div>
                    </div>}

                  {/* Info Box */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      <span className="font-semibold text-gray-900">Opzioni disponibili:</span>
                      <br />• <strong>Invitato singolo</strong>: Non selezionare nessuna famiglia
                      <br />• <strong>Membro famiglia</strong>: Associa ad una famiglia esistente
                      <br />• <strong>Capo famiglia</strong>: Associa ad una famiglia e attiva lo switch
                      <br />• <strong>Nuova famiglia</strong>: Crea una nuova famiglia (diventerà automaticamente capo)
                    </p>
                  </div>
                </div>
              </div>

              {/* Assegnazioni Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Assegnazioni</h3>

                <div className="space-y-4">
                  {/* Gruppi */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Gruppo
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full h-10 justify-between border-gray-200 rounded-lg">
                          <span className="text-gray-500">
                            {selectedGruppo ? selectedGruppo.nome : "Seleziona gruppo (opzionale)"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca gruppo..." />
                          <CommandEmpty>
                            <div className="py-6 text-center text-sm text-gray-500">
                              Nessun gruppo trovato
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {/* Option to clear selection */}
                            {selectedGruppo && (
                              <CommandItem 
                                onSelect={() => setSelectedGruppo(null)}
                                className="text-gray-500"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Nessun gruppo
                              </CommandItem>
                            )}
                            {gruppi.map(gruppo => (
                              <CommandItem 
                                key={gruppo.id} 
                                onSelect={() => setSelectedGruppo(gruppo)}
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: gruppo.colore }}
                                  />
                                  {gruppo.nome}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Opzionale - Assegna l'invitato ad un gruppo
                    </p>
                  </div>

                  {/* Tavolo */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Tavolo
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full h-10 justify-between border-gray-200 rounded-lg">
                          <span className="text-gray-500">
                            {selectedTavolo ? `Tavolo ${selectedTavolo.numero}` : "Seleziona tavolo (opzionale)"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca tavolo..." />
                          <CommandEmpty>
                            <div className="py-6 text-center text-sm text-gray-500">
                              Nessun tavolo ancora creato
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {tavoli.map(tavolo => <CommandItem key={tavolo.id} onSelect={() => setSelectedTavolo(tavolo)}>
                                <div className="flex items-center justify-between w-full">
                                  <span>Tavolo {tavolo.numero}</span>
                                  <span className="text-xs text-gray-500">
                                    {tavolo.postiOccupati}/{tavolo.postiTotali} posti
                                  </span>
                                </div>
                              </CommandItem>)}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Opzionale - Assegna l'invitato ad un tavolo
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="shrink-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={isLoading}>
                <Trash2 className="h-4 w-4" />
                Elimina
              </Button>
              <Button type="submit" disabled={isLoading} onClick={form.handleSubmit(handleSave)} className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700">
                {isLoading ? <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </> : <>
                    <Check className="h-4 w-4" />
                    Salva
                  </>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminare questo invitato?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. L'invitato "{invitato.nome}{" "}
              {invitato.cognome}" sarà eliminato definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}