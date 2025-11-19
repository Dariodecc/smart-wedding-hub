import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, MapPin, Euro, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Wedding {
  id: string;
  couple_name: string;
  wedding_date: string;
  ceremony_location: string;
  reception_location: string | null;
  service_cost: number;
  enable_multi_rsvp: boolean;
  webhook_url: string | null;
}

interface SpouseUser {
  id: string;
  email: string;
}

const Matrimoni = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [formData, setFormData] = useState({
    couple_name: "",
    wedding_date: new Date(),
    ceremony_location: "",
    reception_location: "",
    service_cost: "",
    enable_multi_rsvp: false,
    webhook_url: "",
    selected_spouses: [] as string[],
  });
  const [spouseSearchOpen, setSpouseSearchOpen] = useState(false);

  // Fetch all weddings
  const { data: weddings, isLoading } = useQuery({
    queryKey: ["weddings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("*")
        .order("wedding_date", { ascending: false });
      
      if (error) throw error;
      return data as Wedding[];
    },
  });

  // Fetch spouse users (users with 'sposi' role)
  const { data: spouseUsers } = useQuery({
    queryKey: ["spouse-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sposi");
      
      if (error) throw error;
      
      // Fetch user details
      const userIds = data.map(ur => ur.user_id);
      const users: SpouseUser[] = [];
      
      for (const userId of userIds) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (!userError && userData.user) {
          users.push({
            id: userData.user.id,
            email: userData.user.email || "",
          });
        }
      }
      
      return users;
    },
  });

  // Fetch wedding spouses for a specific wedding
  const fetchWeddingSpouses = async (weddingId: string) => {
    const { data, error } = await supabase
      .from("wedding_spouses")
      .select("user_id")
      .eq("wedding_id", weddingId);
    
    if (error) throw error;
    return data.map(ws => ws.user_id);
  };

  // Get available spouse users (not already assigned to a wedding)
  const { data: assignedSpouses } = useQuery({
    queryKey: ["assigned-spouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wedding_spouses")
        .select("user_id");
      
      if (error) throw error;
      return data.map(ws => ws.user_id);
    },
  });

  const availableSpouses = spouseUsers?.filter(
    user => !assignedSpouses?.includes(user.id) || 
    (editingWedding && formData.selected_spouses.includes(user.id))
  ) || [];

  // Create wedding mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: wedding, error } = await supabase
        .from("weddings")
        .insert({
          couple_name: data.couple_name,
          wedding_date: format(data.wedding_date, "yyyy-MM-dd"),
          ceremony_location: data.ceremony_location,
          reception_location: data.reception_location || null,
          service_cost: parseFloat(data.service_cost),
          enable_multi_rsvp: data.enable_multi_rsvp,
          webhook_url: data.enable_multi_rsvp ? data.webhook_url : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert wedding spouses
      if (data.selected_spouses.length > 0) {
        const { error: spousesError } = await supabase
          .from("wedding_spouses")
          .insert(
            data.selected_spouses.map(userId => ({
              wedding_id: wedding.id,
              user_id: userId,
            }))
          );
        
        if (spousesError) throw spousesError;
      }

      return wedding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weddings"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-spouses"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Matrimonio creato",
        description: "Il matrimonio è stato creato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update wedding mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("weddings")
        .update({
          couple_name: data.couple_name,
          wedding_date: format(data.wedding_date, "yyyy-MM-dd"),
          ceremony_location: data.ceremony_location,
          reception_location: data.reception_location || null,
          service_cost: parseFloat(data.service_cost),
          enable_multi_rsvp: data.enable_multi_rsvp,
          webhook_url: data.enable_multi_rsvp ? data.webhook_url : null,
        })
        .eq("id", id);

      if (error) throw error;

      // Delete existing spouses
      await supabase.from("wedding_spouses").delete().eq("wedding_id", id);

      // Insert new spouses
      if (data.selected_spouses.length > 0) {
        const { error: spousesError } = await supabase
          .from("wedding_spouses")
          .insert(
            data.selected_spouses.map(userId => ({
              wedding_id: id,
              user_id: userId,
            }))
          );
        
        if (spousesError) throw spousesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weddings"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-spouses"] });
      setEditingWedding(null);
      resetForm();
      toast({
        title: "Matrimonio aggiornato",
        description: "Il matrimonio è stato aggiornato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete wedding mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weddings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weddings"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-spouses"] });
      toast({
        title: "Matrimonio eliminato",
        description: "Il matrimonio è stato eliminato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      couple_name: "",
      wedding_date: new Date(),
      ceremony_location: "",
      reception_location: "",
      service_cost: "",
      enable_multi_rsvp: false,
      webhook_url: "",
      selected_spouses: [],
    });
  };

  const handleEdit = async (wedding: Wedding) => {
    const spouses = await fetchWeddingSpouses(wedding.id);
    setFormData({
      couple_name: wedding.couple_name,
      wedding_date: new Date(wedding.wedding_date),
      ceremony_location: wedding.ceremony_location,
      reception_location: wedding.reception_location || "",
      service_cost: wedding.service_cost.toString(),
      enable_multi_rsvp: wedding.enable_multi_rsvp,
      webhook_url: wedding.webhook_url || "",
      selected_spouses: spouses,
    });
    setEditingWedding(wedding);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWedding) {
      updateMutation.mutate({ id: editingWedding.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleSpouse = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_spouses: prev.selected_spouses.includes(userId)
        ? prev.selected_spouses.filter(id => id !== userId)
        : [...prev.selected_spouses, userId],
    }));
  };

  const removeSpouse = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_spouses: prev.selected_spouses.filter(id => id !== userId),
    }));
  };

  const getSpouseEmail = (userId: string) => {
    return spouseUsers?.find(u => u.id === userId)?.email || userId;
  };

  const WeddingForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="couple_name">Nome della coppia *</Label>
        <Input
          id="couple_name"
          value={formData.couple_name}
          onChange={(e) => setFormData({ ...formData, couple_name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Utenti Sposi *</Label>
        <Popover open={spouseSearchOpen} onOpenChange={setSpouseSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-start text-left font-normal"
            >
              Seleziona utenti sposi
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Cerca utente..." />
              <CommandEmpty>Nessun utente trovato.</CommandEmpty>
              <CommandGroup>
                {availableSpouses.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => {
                      toggleSpouse(user.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.selected_spouses.includes(user.id)}
                        onChange={() => {}}
                        className="h-4 w-4"
                      />
                      <span>{user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {formData.selected_spouses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.selected_spouses.map((userId) => (
              <Badge key={userId} variant="secondary" className="gap-1">
                {getSpouseEmail(userId)}
                <button
                  type="button"
                  onClick={() => removeSpouse(userId)}
                  className="ml-1 hover:bg-muted rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Data del matrimonio *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.wedding_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.wedding_date ? (
                format(formData.wedding_date, "PPP", { locale: it })
              ) : (
                <span>Seleziona una data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.wedding_date}
              onSelect={(date) => date && setFormData({ ...formData, wedding_date: date })}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ceremony_location">Location della cerimonia *</Label>
        <Input
          id="ceremony_location"
          value={formData.ceremony_location}
          onChange={(e) => setFormData({ ...formData, ceremony_location: e.target.value })}
          placeholder="Via, Città, CAP"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reception_location">Location della sala</Label>
        <Input
          id="reception_location"
          value={formData.reception_location}
          onChange={(e) => setFormData({ ...formData, reception_location: e.target.value })}
          placeholder="Via, Città, CAP (opzionale)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_cost">Costo servizio (€) *</Label>
        <div className="relative">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="service_cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.service_cost}
            onChange={(e) => setFormData({ ...formData, service_cost: e.target.value })}
            className="pl-9"
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enable_multi_rsvp">Abilita RSVP multiplo</Label>
          <Switch
            id="enable_multi_rsvp"
            checked={formData.enable_multi_rsvp}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enable_multi_rsvp: checked })
            }
          />
        </div>

        {formData.enable_multi_rsvp && (
          <div className="space-y-2 pl-4">
            <Label htmlFor="webhook_url">URL Webhook</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditingWedding(null);
            setIsCreateOpen(false);
            resetForm();
          }}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {editingWedding ? "Aggiorna" : "Crea"} Matrimonio
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Matrimoni</h1>
          <p className="text-muted-foreground mt-1">Gestisci i matrimoni e le coppie</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Matrimonio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Matrimonio</DialogTitle>
            </DialogHeader>
            <WeddingForm />
          </DialogContent>
        </Dialog>
      </div>

      {editingWedding && (
        <Dialog open={!!editingWedding} onOpenChange={() => setEditingWedding(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Matrimonio</DialogTitle>
            </DialogHeader>
            <WeddingForm />
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {weddings?.map((wedding) => (
          <Card
            key={wedding.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/matrimoni/${wedding.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{wedding.couple_name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {format(new Date(wedding.wedding_date), "PPP", { locale: it })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{wedding.ceremony_location}</span>
              </div>
              {wedding.reception_location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{wedding.reception_location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{wedding.service_cost.toFixed(2)} €</span>
              </div>
              {wedding.enable_multi_rsvp && (
                <Badge variant="secondary">RSVP Multiplo Attivo</Badge>
              )}
              <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(wedding);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Sei sicuro di voler eliminare questo matrimonio?")) {
                      deleteMutation.mutate(wedding.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {weddings?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nessun matrimonio presente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crea il primo matrimonio usando il pulsante "Nuovo Matrimonio"
          </p>
        </div>
      )}
    </div>
  );
};

export default Matrimoni;
