import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, MapPin, Euro, Edit, Trash2, UserCog } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { WeddingForm } from "@/components/WeddingForm";
import { useAuth } from "@/contexts/AuthContext";

interface Wedding {
  id: string;
  couple_name: string;
  wedding_date: string;
  ceremony_location: string;
  reception_location: string | null;
  service_cost: number;
  enable_multi_rsvp: boolean;
  webhook_url: string | null;
  api_username: string | null;
  api_password: string | null;
}

interface SpouseUser {
  id: string;
  email: string;
}

const Matrimoni = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
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
    api_username: "",
    api_password: "",
  });

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
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("list-users", {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      // Filter only users with 'sposi' role
      const sposiUsers = data.users.filter((user: any) => user.role === 'sposi');
      
      return sposiUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
      })) as SpouseUser[];
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
      // Validate wedding_date is set
      if (!data.wedding_date) {
        throw new Error("La data del matrimonio è obbligatoria");
      }

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
          api_username: data.api_username || null,
          api_password: data.api_password || null,
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
      // Validate wedding_date is set
      if (!data.wedding_date) {
        throw new Error("La data del matrimonio è obbligatoria");
      }

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
          api_username: data.api_username || null,
          api_password: data.api_password || null,
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
      api_username: "",
      api_password: "",
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
      api_username: wedding.api_username || "",
      api_password: wedding.api_password || "",
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

  const handleCancel = () => {
    setEditingWedding(null);
    setIsCreateOpen(false);
    resetForm();
  };

  const getSpouseEmail = (userId: string) => {
    return spouseUsers?.find(u => u.id === userId)?.email || userId;
  };

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
            <WeddingForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={createMutation.isPending}
              isEditing={false}
              availableSpouses={availableSpouses}
              getSpouseEmail={getSpouseEmail}
            />
          </DialogContent>
        </Dialog>
      </div>

      {editingWedding && (
        <Dialog open={!!editingWedding} onOpenChange={() => setEditingWedding(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Matrimonio</DialogTitle>
            </DialogHeader>
            <WeddingForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={updateMutation.isPending}
              isEditing={true}
              availableSpouses={availableSpouses}
              getSpouseEmail={getSpouseEmail}
            />
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
                {wedding.wedding_date 
                  ? format(new Date(wedding.wedding_date), "PPP", { locale: it })
                  : "Data non specificata"
                }
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
                <span className="font-semibold">
                  {wedding.service_cost != null 
                    ? `${wedding.service_cost.toFixed(2)} €` 
                    : "Non specificato"}
                </span>
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
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    startImpersonation(wedding.id);
                  }}
                >
                  <UserCog className="h-4 w-4" />
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
