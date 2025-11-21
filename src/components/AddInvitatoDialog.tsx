import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { PhoneInput } from "@/components/ui/phone-input";

const formSchema = z.object({
  nome: z.string().min(1, "Il nome è obbligatorio"),
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  cellulare: z
    .string()
    .min(8, "Numero troppo corto")
    .regex(/^\+\d+$/, "Numero di telefono non valido"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  tipo_ospite: z.enum(["Neonato", "Bambino", "Ragazzo", "Adulto"], {
    required_error: "Seleziona un tipo di ospite",
  }),
  preferenze_alimentari: z.array(z.string()).min(1, "Seleziona almeno una preferenza"),
  famiglia_id: z.string().optional(),
  is_capo_famiglia: z.boolean().default(false),
  crea_famiglia: z.boolean().default(false),
  nome_nuova_famiglia: z.string().optional(),
}).refine(
  (data) => {
    if (data.crea_famiglia) {
      return data.nome_nuova_famiglia && data.nome_nuova_famiglia.length > 0;
    }
    return true;
  },
  {
    message: "Il nome della famiglia è obbligatorio",
    path: ["nome_nuova_famiglia"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface AddInvitatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
}

const DIETARY_OPTIONS = [
  { value: "Vegetariano", label: "Vegetariano" },
  { value: "Vegano", label: "Vegano" },
  { value: "Celiaco", label: "Celiaco" },
  { value: "Kosher", label: "Kosher" },
  { value: "Halal", label: "Halal" },
  { value: "Nessuna Preferenza", label: "Nessuna Preferenza" },
];

export function AddInvitatoDialog({
  open,
  onOpenChange,
  weddingId,
}: AddInvitatoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: famiglie } = useQuery({
    queryKey: ["famiglie", weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("famiglie")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!weddingId && open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      cognome: "",
      cellulare: "",
      email: "",
      tipo_ospite: undefined,
      preferenze_alimentari: [],
      famiglia_id: undefined,
      is_capo_famiglia: false,
      crea_famiglia: false,
      nome_nuova_famiglia: "",
    },
  });

  const creaFamiglia = form.watch("crea_famiglia");
  const famigliaId = form.watch("famiglia_id");

  // Check if phone number already exists for this matrimonio
  const checkDuplicatePhone = async (phoneNumber: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('invitati')
        .select('id, nome, cognome')
        .eq('wedding_id', weddingId)
        .eq('cellulare', phoneNumber)
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking duplicate phone:', error);
      return false;
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // CRITICAL: Check for duplicate phone number
      const isDuplicate = await checkDuplicatePhone(values.cellulare);
      
      if (isDuplicate) {
        toast({
          title: "Invitato già presente in lista",
          description: "Controlla il numero di cellulare inserito.",
          variant: "destructive",
        });
        
        form.setError('cellulare', {
          type: 'manual',
          message: 'Questo numero è già presente in lista'
        });
        
        setIsSubmitting(false);
        return;
      }

      let targetFamigliaId = values.famiglia_id;

      // Scenario 1: Create new famiglia
      if (values.crea_famiglia && values.nome_nuova_famiglia) {
        const { data: newFamiglia, error: famigliaError } = await supabase
          .from("famiglie")
          .insert({
            nome: values.nome_nuova_famiglia,
            wedding_id: weddingId,
          })
          .select()
          .single();

        if (famigliaError) throw famigliaError;
        targetFamigliaId = newFamiglia.id;
      }

      // Check if famiglia already has a capo
      if (values.is_capo_famiglia && targetFamigliaId) {
        const { data: existingCapo, error: capoError } = await supabase
          .from("invitati")
          .select("id")
          .eq("famiglia_id", targetFamigliaId)
          .eq("is_capo_famiglia", true)
          .maybeSingle();

        if (capoError) throw capoError;

        if (existingCapo) {
          toast({
            title: "Errore",
            description: "Questa famiglia ha già un capo famiglia",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Determine if guest should have RSVP link
      // Only capo famiglia and single guests have rsvp_uuid
      const shouldBeCapo = values.crea_famiglia ? true : values.is_capo_famiglia;
      const shouldHaveRsvpLink = !targetFamigliaId || shouldBeCapo;
      
      // Insert invitato
      const { error: invitatoError } = await supabase.from("invitati").insert({
        wedding_id: weddingId,
        famiglia_id: targetFamigliaId || null,
        nome: values.nome,
        cognome: values.cognome,
        cellulare: values.cellulare,
        email: values.email || null,
        tipo_ospite: values.tipo_ospite,
        preferenze_alimentari: values.preferenze_alimentari,
        is_capo_famiglia: shouldBeCapo,
        // Only set rsvp_uuid if shouldHaveRsvpLink is true
        ...(shouldHaveRsvpLink && { rsvp_uuid: crypto.randomUUID() })
      });

      if (invitatoError) throw invitatoError;

      toast({
        title: "Successo",
        description: "Invitato aggiunto con successo!",
      });

      queryClient.invalidateQueries({ queryKey: ["invitati"] });
      queryClient.invalidateQueries({ queryKey: ["famiglie"] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding guest:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta dell'invitato",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">
                Aggiungi Invitato
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Compila i dettagli del nuovo invitato
              </p>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Informazioni Base */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informazioni Base
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Nome *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Mario"
                                className="h-10 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cognome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Cognome *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Rossi"
                                className="h-10 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cellulare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Cellulare *
                          </FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="340 123 4567"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="mario.rossi@email.com"
                              className="h-10 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tipo_ospite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Tipo di Ospite *
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg">
                                  <SelectValue placeholder="Seleziona tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Neonato">Neonato</SelectItem>
                                <SelectItem value="Bambino">Bambino</SelectItem>
                                <SelectItem value="Ragazzo">Ragazzo</SelectItem>
                                <SelectItem value="Adulto">Adulto</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferenze_alimentari"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Preferenze Alimentari *
                            </FormLabel>
                            <FormControl>
                              <MultiSelect
                                options={DIETARY_OPTIONS}
                                selected={field.value}
                                onChange={field.onChange}
                                placeholder="Seleziona preferenze"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Gestione Famiglia */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Gestione Famiglia
                  </h3>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="famiglia_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Associa Famiglia
                          </FormLabel>
                          <FormControl>
                            <ComboboxSelect
                              options={
                                famiglie?.map((f) => ({
                                  value: f.id,
                                  label: f.nome,
                                })) || []
                              }
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Cerca famiglia..."
                              disabled={creaFamiglia}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_capo_famiglia"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium text-gray-900">
                                È il capo famiglia
                              </FormLabel>
                              <p className="text-xs text-gray-500">
                                Questa persona gestirà l'RSVP per tutta la famiglia
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!famigliaId || creaFamiglia}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">oppure</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="crea_famiglia"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium text-gray-900">
                                Crea una nuova famiglia
                              </FormLabel>
                              <p className="text-xs text-gray-500">
                                L'invitato diventerà automaticamente il capo famiglia
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) {
                                    form.setValue("famiglia_id", undefined);
                                    form.setValue("is_capo_famiglia", false);
                                  }
                                }}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    {creaFamiglia && (
                      <FormField
                        control={form.control}
                        name="nome_nuova_famiglia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Nome Nuova Famiglia *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Famiglia Rossi"
                                className="h-10 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
                className="h-10 px-4 border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={form.handleSubmit(onSubmit)}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Salvando..." : "Aggiungi Invitato"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
