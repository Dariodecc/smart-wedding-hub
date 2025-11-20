import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  X,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Loader2,
  Users,
  Crown,
  ChevronDown,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

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
  matrimonioId,
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
  const gruppi: any[] = [];
  const tavoli: any[] = [];
  
  // Fetch famiglie
  const { data: famiglie = [] } = useQuery({
    queryKey: ["famiglie", matrimonioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("famiglie")
        .select("*")
        .eq("wedding_id", matrimonioId)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const form = useForm({
    defaultValues: {
      nome: invitato?.nome || "",
      cognome: invitato?.cognome || "",
      cellulare: invitato?.cellulare || "",
      email: invitato?.email || "",
      tipo_ospite: invitato?.tipo_ospite || "Adulto",
      preferenze_alimentari: invitato?.preferenze_alimentari || [],
      rsvp_status: invitato?.rsvp_status || "In attesa",
      nomeFamiglia: "",
    },
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
        nomeFamiglia: "",
      });
      setSelectedFamiglia(invitato.famiglia || null);
      setIsCapoFamiglia(invitato.is_capo_famiglia || false);
      setCreaFamiglia(false);
    }
  }, [invitato, form]);
  
  // Check if selected famiglia already has a capo
  const checkCapoFamiglia = async (famigliaId: string) => {
    const { data } = await supabase
      .from("invitati")
      .select("id")
      .eq("famiglia_id", famigliaId)
      .eq("is_capo_famiglia", true)
      .neq("id", invitato.id)
      .single();
    
    setFamigliaHasCapo(!!data);
  };

  const rsvpLink = `${window.location.origin}/rsvp/${invitato?.rsvp_uuid}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rsvpLink);
    setCopied(true);
    toast.success("Link copiato!", {
      position: isMobile ? "top-center" : "bottom-right",
      duration: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeVariant = (status: string) => {
    if (status === "Ci sarò") return "bg-green-600 hover:bg-green-700";
    if (status === "In attesa") return "bg-yellow-600 hover:bg-yellow-700";
    return "bg-red-600 hover:bg-red-700";
  };

  const handleSave = async (data: any) => {
    setIsLoading(true);
    try {
      let famigliaId = null;
      let shouldBeCapo = false;
      
      // Scenario 1: Creating new famiglia
      if (creaFamiglia && data.nomeFamiglia) {
        const { data: newFamiglia, error: famigliaError } = await supabase
          .from("famiglie")
          .insert({
            nome: data.nomeFamiglia,
            wedding_id: matrimonioId,
          })
          .select()
          .single();
        
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
      
      const { error } = await supabase
        .from("invitati")
        .update({
          nome: data.nome,
          cognome: data.cognome,
          cellulare: data.cellulare,
          email: data.email || null,
          tipo_ospite: data.tipo_ospite,
          preferenze_alimentari: data.preferenze_alimentari,
          rsvp_status: data.rsvp_status,
          famiglia_id: famigliaId,
          is_capo_famiglia: shouldBeCapo,
        })
        .eq("id", invitato.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["invitati", matrimonioId] });
      await queryClient.invalidateQueries({ queryKey: ["famiglie", matrimonioId] });

      toast.success("Modifiche salvate con successo", {
        position: isMobile ? "top-center" : "bottom-right",
      });

      onClose();
    } catch (error) {
      console.error("Error updating invitato:", error);
      toast.error("Errore nel salvare le modifiche", {
        position: isMobile ? "top-center" : "bottom-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("invitati")
        .delete()
        .eq("id", invitato.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["invitati", matrimonioId] });

      toast.success("Invitato eliminato con successo", {
        position: isMobile ? "top-center" : "bottom-right",
      });

      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error("Error deleting invitato:", error);
      toast.error("Errore nell'eliminare l'invitato", {
        position: isMobile ? "top-center" : "bottom-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!invitato) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:w-[85vw] md:w-[700px] lg:w-[800px] xl:w-[900px] h-full p-0 flex flex-col overflow-hidden"
        >
          {/* Header - Fixed */}
          <div className="shrink-0">
...
          </div>

          {/* Scrollable Content - Takes all available space */}
          <div className="flex-1 overflow-y-auto">
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="p-4 sm:p-5 md:p-6 pb-32 space-y-6"
            >
              {/* RSVP Status Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Status & RSVP</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={isMobile ? "text-base" : "text-sm"}>
                      RSVP Status
                    </Label>
                    <Badge className={getBadgeVariant(form.watch("rsvp_status"))}>
                      {form.watch("rsvp_status")}
                    </Badge>
                  </div>
                  <Select
                    value={form.watch("rsvp_status")}
                    onValueChange={(value) => form.setValue("rsvp_status", value)}
                  >
                    <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="In attesa"
                        className={isMobile ? "h-12 text-base" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          In attesa
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="Ci sarò"
                        className={isMobile ? "h-12 text-base" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Ci sarò
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="Non ci sarò"
                        className={isMobile ? "h-12 text-base" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Non ci sarò
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={isMobile ? "text-base" : "text-sm"}>
                    Link RSVP
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={rsvpLink}
                      readOnly
                      className="bg-muted text-muted-foreground flex-1 text-sm truncate"
                    />
                    {isMobile ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-[80px] h-12"
                        onClick={copyToClipboard}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        {copied ? "Copiato" : "Copia"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyToClipboard}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Informazioni Base */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Informazioni Base</h3>

                {isMobile ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-base">Nome *</Label>
                      <Input
                        {...form.register("nome", { required: true })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">Cognome *</Label>
                      <Input
                        {...form.register("cognome", { required: true })}
                        className="h-12"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        {...form.register("nome", { required: true })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cognome *</Label>
                      <Input
                        {...form.register("cognome", { required: true })}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className={isMobile ? "text-base" : "text-sm"}>
                    Cellulare *
                  </Label>
                  <Input
                    type="tel"
                    {...form.register("cellulare", { required: true })}
                    className={isMobile ? "h-12 text-base" : "h-10"}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={isMobile ? "text-base" : "text-sm"}>
                    Email
                  </Label>
                  <Input
                    type="email"
                    {...form.register("email")}
                    className={isMobile ? "h-12 text-base" : "h-10"}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={isMobile ? "text-base" : "text-sm"}>
                    Tipo Ospite *
                  </Label>
                  <Select
                    value={form.watch("tipo_ospite")}
                    onValueChange={(value) => form.setValue("tipo_ospite", value)}
                  >
                    <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Neonato", "Bambino", "Ragazzo", "Adulto"].map((tipo) => (
                        <SelectItem
                          key={tipo}
                          value={tipo}
                          className={isMobile ? "h-12 text-base" : ""}
                        >
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={isMobile ? "text-base" : "text-sm"}>
                    Preferenze Alimentari
                  </Label>
                  <Select
                    value={form.watch("preferenze_alimentari")?.[0] || "none"}
                    onValueChange={(value) =>
                      form.setValue("preferenze_alimentari", value === "none" ? [] : [value])
                    }
                  >
                    <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                      <SelectValue placeholder="Seleziona preferenza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className={isMobile ? "h-12 text-base" : ""}>
                        Nessuna
                      </SelectItem>
                      {["Vegetariano", "Vegano", "Celiaco", "Intollerante al lattosio"].map(
                        (pref) => (
                          <SelectItem
                            key={pref}
                            value={pref}
                            className={isMobile ? "h-12 text-base" : ""}
                          >
                            {pref}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Famiglia */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Famiglia</h3>

                {/* Associa Famiglia - Select with search */}
                <div className="space-y-2">
                  <Label htmlFor="associa-famiglia" className={isMobile ? "text-base" : "text-sm"}>
                    Associa Famiglia
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${isMobile ? "h-12 text-base" : "h-10"}`}
                        disabled={creaFamiglia}
                      >
                        {selectedFamiglia ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {selectedFamiglia.nome}
                          </div>
                        ) : (
                          "Seleziona famiglia..."
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca famiglia..." />
                        <CommandEmpty>Nessuna famiglia trovata</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {famiglie.map((famiglia) => (
                            <CommandItem
                              key={famiglia.id}
                              value={famiglia.nome}
                              onSelect={() => {
                                setSelectedFamiglia(famiglia);
                                checkCapoFamiglia(famiglia.id);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Check
                                  className={`h-4 w-4 ${
                                    selectedFamiglia?.id === famiglia.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{famiglia.nome}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Opzionale - Seleziona una famiglia esistente
                  </p>
                </div>

                {/* È il Capo Famiglia - Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="capo-famiglia"
                      className={isMobile ? "text-base font-medium" : "text-sm font-medium"}
                    >
                      È il capo famiglia
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Riceverà il link RSVP per tutta la famiglia
                    </p>
                  </div>
                  <Switch
                    id="capo-famiglia"
                    checked={isCapoFamiglia}
                    onCheckedChange={(checked) => {
                      if (selectedFamiglia && checked) {
                        if (famigliaHasCapo) {
                          toast.error("Questa famiglia ha già un capo famiglia", {
                            position: isMobile ? "top-center" : "bottom-right",
                          });
                          return;
                        }
                      }
                      setIsCapoFamiglia(checked);
                    }}
                    disabled={!selectedFamiglia}
                  />
                </div>

                {/* Visual indicator when switch is disabled */}
                {!selectedFamiglia && !creaFamiglia && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Seleziona prima una famiglia per abilitare questa opzione
                  </p>
                )}

                {/* Show capo famiglia badge if enabled */}
                {selectedFamiglia && isCapoFamiglia && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-900">
                      <Crown className="h-4 w-4" />
                      <span className="font-medium">Questo invitato sarà il capo famiglia</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Riceverà un link RSVP univoco per gestire tutta la famiglia
                    </p>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Oppure Crea una Nuova Famiglia - Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="crea-famiglia"
                      className={isMobile ? "text-base font-medium" : "text-sm font-medium"}
                    >
                      Oppure crea una nuova famiglia
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Crea una nuova famiglia e assegna questo invitato come capo
                    </p>
                  </div>
                  <Switch
                    id="crea-famiglia"
                    checked={creaFamiglia}
                    onCheckedChange={(checked) => {
                      setCreaFamiglia(checked);
                      if (checked) {
                        setSelectedFamiglia(null);
                        setIsCapoFamiglia(false);
                      } else {
                        form.setValue("nomeFamiglia", "");
                      }
                    }}
                  />
                </div>

                {/* Nome Nuova Famiglia - Conditional Field */}
                {creaFamiglia && (
                  <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-900 font-medium mb-2">
                      <PlusCircle className="h-4 w-4" />
                      Nuova Famiglia
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nome-famiglia" className={isMobile ? "text-base" : "text-sm"}>
                        Nome Nuova Famiglia *
                      </Label>
                      <Input
                        id="nome-famiglia"
                        {...form.register("nomeFamiglia", {
                          required: creaFamiglia ? "Il nome della famiglia è obbligatorio" : false,
                        })}
                        placeholder="es. Famiglia Rossi"
                        className={`bg-white ${isMobile ? "h-12 text-base" : "h-10"}`}
                      />
                      {form.formState.errors.nomeFamiglia && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.nomeFamiglia.message}
                        </p>
                      )}
                      <p className="text-xs text-green-700">
                        Questo invitato diventerà automaticamente il capo famiglia
                      </p>
                    </div>
                  </div>
                )}

                {/* Help text explaining the options */}
                <div className="p-3 bg-muted rounded-lg border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Opzioni disponibili:</strong>
                    <br />• <strong>Invitato singolo</strong>: Non selezionare nessuna famiglia
                    <br />• <strong>Membro famiglia</strong>: Associa ad una famiglia esistente
                    <br />• <strong>Capo famiglia</strong>: Associa ad una famiglia e attiva lo
                    switch "È il capo famiglia"
                    <br />• <strong>Nuova famiglia</strong>: Crea una nuova famiglia (diventerà
                    automaticamente capo)
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Assegnazioni */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Assegnazioni</h3>

                {/* Gruppi */}
                <div className="space-y-2">
                  <Label htmlFor="gruppo" className={isMobile ? "text-base" : "text-sm"}>
                    Gruppo
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${isMobile ? "h-12 text-base" : "h-10"}`}
                      >
                        {selectedGruppo ? selectedGruppo.nome : "Seleziona gruppo (opzionale)"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca gruppo..." />
                        <CommandEmpty>
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Nessun gruppo disponibile
                            <p className="text-xs text-muted-foreground mt-1">(Da implementare)</p>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {gruppi.length > 0 && gruppi.map((gruppo) => (
                            <CommandItem
                              key={gruppo.id}
                              onSelect={() => setSelectedGruppo(gruppo)}
                            >
                              {gruppo.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Opzionale - Assegna l'invitato ad un gruppo
                  </p>
                </div>

                {/* Tavolo */}
                <div className="space-y-2">
                  <Label htmlFor="tavolo" className={isMobile ? "text-base" : "text-sm"}>
                    Tavolo
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${isMobile ? "h-12 text-base" : "h-10"}`}
                      >
                        {selectedTavolo ? `Tavolo ${selectedTavolo.numero}` : "Seleziona tavolo (opzionale)"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca tavolo..." />
                        <CommandEmpty>
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Nessun tavolo ancora creato
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {tavoli.map((tavolo) => (
                            <CommandItem
                              key={tavolo.id}
                              onSelect={() => setSelectedTavolo(tavolo)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>Tavolo {tavolo.numero}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tavolo.postiOccupati}/{tavolo.postiTotali} posti
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Opzionale - Assegna l'invitato ad un tavolo
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="shrink-0 border-t bg-background p-4 md:p-6 shadow-lg">
            {isMobile ? (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-12 flex-1"
                  disabled={isLoading}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Elimina
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={form.handleSubmit(handleSave)}
                  className="h-12 flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Salva...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Salva
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={form.handleSubmit(handleSave)}
                  className="flex items-center gap-2 min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Salva
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className={isMobile ? "w-[calc(100vw-2rem)] max-w-md" : "max-w-md"}
        >
          <AlertDialogHeader className={isMobile ? "space-y-3" : ""}>
            <AlertDialogTitle className={isMobile ? "text-lg" : "text-xl"}>
              Eliminare questo invitato?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={isMobile ? "text-base leading-relaxed" : "text-base"}
            >
              Questa azione è irreversibile. L'invitato "{invitato.nome}{" "}
              {invitato.cognome}" sarà eliminato definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className={isMobile ? "flex-col gap-2 sm:flex-row" : ""}
          >
            <AlertDialogCancel
              className={isMobile ? "h-12 w-full sm:w-auto" : ""}
              disabled={isLoading}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                isMobile
                  ? "h-12 w-full sm:w-auto bg-red-600 hover:bg-red-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
