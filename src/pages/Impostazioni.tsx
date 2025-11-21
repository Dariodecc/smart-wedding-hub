import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarCheck,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  CheckCircle,
  Trash2,
  Utensils,
  Plus,
  Star,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";

const DEFAULT_PREFERENCES = [
  "Vegetariano",
  "Vegano",
  "Celiaco",
  "Intollerante al lattosio",
];

const Impostazioni = () => {
  const { wedding, isLoading: loadingWedding } = useCurrentMatrimonio();
  const matrimonioId = wedding?.id;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  // State
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [newPreference, setNewPreference] = useState("");
  const [isAddingPreference, setIsAddingPreference] = useState(false);

  // Fetch current settings
  const { data: matrimonio, isLoading } = useQuery({
    queryKey: ["matrimonio-settings", matrimonioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("password, wedding_date")
        .eq("id", matrimonioId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!matrimonioId,
  });

  // Fetch custom dietary preferences
  const { data: customPreferences = [], refetch: refetchPreferences } = useQuery({
    queryKey: ["custom-preferences", matrimonioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preferenze_alimentari_custom")
        .select("*")
        .eq("wedding_id", matrimonioId!)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    enabled: !!matrimonioId,
  });

  // Combined preferences list
  const allPreferences = useMemo(
    () => [...DEFAULT_PREFERENCES, ...customPreferences.map((p) => p.nome)],
    [customPreferences]
  );

  // Calculate days until wedding
  const calculateDaysUntil = (date: string) => {
    const today = new Date();
    const wedding = new Date(date);
    const diff = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Password generator
  const handleGeneratePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    setGeneratedPassword(password);
  };

  // Save wedding date
  const handleSaveDate = async (data: { wedding_date: string }) => {
    try {
      setIsSavingDate(true);

      const { error } = await supabase
        .from("weddings")
        .update({ wedding_date: data.wedding_date })
        .eq("id", matrimonioId!);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["matrimonio-settings", matrimonioId] });

      toast({
        title: "Data matrimonio salvata",
        description: "La data è stata aggiornata con successo",
      });
    } catch (error) {
      console.error("Error saving wedding date:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvare la data",
        variant: "destructive",
      });
    } finally {
      setIsSavingDate(false);
    }
  };

  // Save password
  const handleSavePassword = async (data: { password: string }) => {
    try {
      setIsSavingPassword(true);

      const { error } = await supabase
        .from("weddings")
        .update({ password: data.password })
        .eq("id", matrimonioId!);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["matrimonio-settings", matrimonioId] });

      toast({
        title: "Password salvata",
        description: "La password è stata aggiornata con successo",
      });

      setGeneratedPassword("");
    } catch (error) {
      console.error("Error saving password:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvare la password",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Remove password
  const handleRemovePassword = async () => {
    if (!confirm("Sei sicuro di voler rimuovere la password?")) return;

    try {
      setIsSavingPassword(true);

      const { error } = await supabase
        .from("weddings")
        .update({ password: null })
        .eq("id", matrimonioId!);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["matrimonio-settings", matrimonioId] });

      toast({
        title: "Password rimossa",
        description: "La password è stata rimossa con successo",
      });

      setValue("password", "");
    } catch (error) {
      console.error("Error removing password:", error);
      toast({
        title: "Errore",
        description: "Errore nella rimozione della password",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Add dietary preference
  const handleAddPreference = async () => {
    const trimmed = newPreference.trim();

    if (!trimmed) return;

    // Check if already exists (case insensitive)
    const exists = allPreferences.some(
      (p) => p.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      toast({
        title: "Errore",
        description: "Questa preferenza esiste già",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingPreference(true);

      const { error } = await supabase
        .from("preferenze_alimentari_custom")
        .insert({
          wedding_id: matrimonioId!,
          nome: trimmed,
        });

      if (error) throw error;

      await refetchPreferences();

      toast({
        title: "Preferenza aggiunta",
        description: "La preferenza è stata aggiunta con successo",
      });

      setNewPreference("");
    } catch (error) {
      console.error("Error adding preference:", error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiungere la preferenza",
        variant: "destructive",
      });
    } finally {
      setIsAddingPreference(false);
    }
  };

  // Delete dietary preference
  const handleDeletePreference = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa preferenza?")) return;

    try {
      const { error } = await supabase
        .from("preferenze_alimentari_custom")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await refetchPreferences();

      toast({
        title: "Preferenza eliminata",
        description: "La preferenza è stata eliminata con successo",
      });
    } catch (error) {
      console.error("Error deleting preference:", error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminare la preferenza",
        variant: "destructive",
      });
    }
  };

  if (loadingWedding || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                Impostazioni
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                Configura le impostazioni del matrimonio
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Wedding Date Card */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Data del Matrimonio
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Imposta la data del tuo grande giorno
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit(handleSaveDate)}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wedding-date" className={isMobile ? "text-base" : "text-sm"}>
                      Data Matrimonio
                    </Label>
                    <Input
                      id="wedding-date"
                      type="date"
                      defaultValue={matrimonio?.wedding_date}
                      {...register("wedding_date")}
                      className={cn(
                        "border-gray-200 rounded-lg",
                        isMobile ? "h-12 text-base" : "h-10"
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      Questa data verrà utilizzata per i countdown e le notifiche
                    </p>
                  </div>

                  {/* Current Date Display */}
                  {matrimonio?.wedding_date && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CalendarCheck className="h-5 w-5 text-purple-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-purple-900">
                            Data attuale:{" "}
                            {new Date(matrimonio.wedding_date).toLocaleDateString("it-IT", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-purple-700 mt-0.5">
                            {calculateDaysUntil(matrimonio.wedding_date)} giorni mancanti
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSavingDate}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSavingDate ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Salva Data
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Password Card */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Password Protezione
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Proteggi pagine specifiche con una password
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit(handleSavePassword)}>
                <div className="space-y-4">
                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className={isMobile ? "text-base" : "text-sm"}>
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password", {
                          minLength: {
                            value: 6,
                            message: "La password deve essere di almeno 6 caratteri",
                          },
                        })}
                        placeholder="Inserisci una password"
                        className={cn(
                          "pr-20 border-gray-200 rounded-lg",
                          isMobile ? "h-12 text-base" : "h-10"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.password.message as string}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Minimo 6 caratteri. Questa password sarà richiesta per accedere a pagine
                      protette.
                    </p>
                  </div>

                  {/* Password Generator */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Genera Password Sicura
                        </p>
                        <p className="text-xs text-blue-700">
                          Crea automaticamente una password casuale e sicura
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePassword}
                        className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Genera
                      </Button>
                    </div>

                    {generatedPassword && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-sm font-mono text-gray-900 flex-1 truncate">
                            {generatedPassword}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassword);
                              toast({
                                title: "Password copiata",
                                description: "La password è stata copiata negli appunti",
                              });
                            }}
                            className="h-8 w-8 shrink-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => setValue("password", generatedPassword)}
                          className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto mt-2"
                        >
                          Usa questa password
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Current Password Info */}
                  {matrimonio?.password && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Password attiva</p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Le pagine protette richiedono l'autenticazione
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isSavingPassword}
                      className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSavingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Salva Password
                        </>
                      )}
                    </Button>

                    {matrimonio?.password && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemovePassword}
                        disabled={isSavingPassword}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Dietary Preferences Card */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Preferenze Alimentari
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Gestisci le opzioni di preferenze alimentari
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Add New Preference */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Aggiungi Nuova Preferenza
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="es. Senza glutine, Kosher..."
                      value={newPreference}
                      onChange={(e) => setNewPreference(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPreference();
                        }
                      }}
                      className={cn(
                        "flex-1 border-gray-200 rounded-lg",
                        isMobile ? "h-12 text-base" : "h-10"
                      )}
                    />
                    <Button
                      type="button"
                      onClick={handleAddPreference}
                      disabled={!newPreference.trim() || isAddingPreference}
                      className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                    >
                      {isAddingPreference ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Aggiungi</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Preferences List */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Preferenze Disponibili ({allPreferences.length})
                  </Label>

                  <div className="space-y-2">
                    {/* Default Preferences */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predefinite
                      </p>
                      {DEFAULT_PREFERENCES.map((pref) => (
                        <div
                          key={pref}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{pref}</span>
                          </div>
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                            Predefinito
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Custom Preferences */}
                    {customPreferences.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Personalizzate
                        </p>
                        {customPreferences.map((pref) => (
                          <div
                            key={pref.id}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Star className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{pref.nome}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePreference(pref.id)}
                              className="h-8 w-8 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-900">
                      <p className="font-medium mb-1">Come funziona:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Le preferenze predefinite non possono essere eliminate</li>
                        <li>Puoi aggiungere preferenze personalizzate per le esigenze specifiche</li>
                        <li>Queste opzioni saranno disponibili nel form di creazione invitati</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impostazioni;
