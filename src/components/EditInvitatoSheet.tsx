import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Loader2,
  Users,
  Crown,
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

  const form = useForm({
    defaultValues: {
      nome: invitato?.nome || "",
      cognome: invitato?.cognome || "",
      cellulare: invitato?.cellulare || "",
      email: invitato?.email || "",
      tipo_ospite: invitato?.tipo_ospite || "Adulto",
      preferenze_alimentari: invitato?.preferenze_alimentari || [],
      rsvp_status: invitato?.rsvp_status || "In attesa",
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
      });
    }
  }, [invitato, form]);

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
        })
        .eq("id", invitato.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["invitati", matrimonioId] });

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
          className="w-full sm:w-[540px] md:w-[600px] lg:w-[650px] p-0 flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0">
            {isMobile ? (
              <div className="flex items-center justify-between border-b p-4">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold flex-1 text-center">
                  {invitato.nome} {invitato.cognome}
                </h2>
                <div className="w-10" />
              </div>
            ) : (
              <div className="flex items-start justify-between border-b p-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {invitato.nome} {invitato.cognome}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Modifica i dettagli dell'invitato
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="p-4 sm:p-5 md:p-6 pb-24 space-y-6"
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

              {/* Informazioni Base */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Informazioni Base</h3>

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
                    value={form.watch("preferenze_alimentari")?.[0] || ""}
                    onValueChange={(value) =>
                      form.setValue("preferenze_alimentari", value ? [value] : [])
                    }
                  >
                    <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                      <SelectValue placeholder="Seleziona preferenza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className={isMobile ? "h-12 text-base" : ""}>
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

              {/* Famiglia */}
              {invitato.famiglia && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Famiglia & Associazioni</h3>

                  {isMobile ? (
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-base">
                          {invitato.famiglia.nome}
                        </span>
                      </div>
                      {invitato.is_capo_famiglia && (
                        <Badge variant="secondary" className="text-sm w-fit">
                          <Crown className="h-4 w-4 mr-1" />
                          Capo Famiglia
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{invitato.famiglia.nome}</span>
                        {invitato.is_capo_famiglia && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Capo
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="shrink-0 sticky bottom-0 bg-background border-t p-4 md:p-6 shadow-lg">
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
