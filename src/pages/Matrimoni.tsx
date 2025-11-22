import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  BarChart3, 
  Edit, 
  Trash2, 
  MoreVertical,
  Heart,
  Euro
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
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
  created_at: string;
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
  });

  // Fetch all weddings with guest count
  const { data: weddings, isLoading } = useQuery({
    queryKey: ["weddings"],
    queryFn: async () => {
      const { data: weddingsData, error } = await supabase
        .from("weddings")
        .select(`
          *,
          invitati(count)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include guest count
      return weddingsData?.map(wedding => ({
        ...wedding,
        guest_count: wedding.invitati?.[0]?.count || 0
      })) as (Wedding & { guest_count: number })[];
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

  const handleCancel = () => {
    setEditingWedding(null);
    setIsCreateOpen(false);
    resetForm();
  };

  const getSpouseEmail = (userId: string) => {
    return spouseUsers?.find(u => u.id === userId)?.email || userId;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                Matrimoni
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                Gestisci i tuoi matrimoni
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nuovo Matrimonio</span>
            <span className="sm:hidden">Nuovo</span>
          </Button>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Create Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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

          {/* Edit Dialog */}
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

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Wedding Cards */}
          {!isLoading && weddings && weddings.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {weddings.map((wedding) => (
                <Card 
                  key={wedding.id}
                  className="hover:shadow-lg transition-shadow group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-1 truncate">
                          {wedding.couple_name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {wedding.wedding_date 
                              ? new Date(wedding.wedding_date).toLocaleDateString('it-IT', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })
                              : 'Data non specificata'
                            }
                          </span>
                        </CardDescription>
                      </div>
                      
                      {/* Dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/matrimoni/${wedding.id}`} className="flex items-center">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Dashboard Admin
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startImpersonation(wedding.id)}>
                            <Users className="h-4 w-4 mr-2" />
                            Gestisci Invitati
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(wedding)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("Sei sicuro di voler eliminare questo matrimonio?")) {
                                deleteMutation.mutate(wedding.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Wedding details */}
                    <div className="space-y-3">
                      {/* Ceremony Location */}
                      {wedding.ceremony_location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{wedding.ceremony_location}</span>
                        </div>
                      )}
                      
                      {/* Guest count */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>{wedding.guest_count || 0} invitati</span>
                      </div>
                      
                      {/* Service cost */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Euro className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {wedding.service_cost != null 
                            ? `${wedding.service_cost.toFixed(2)} €` 
                            : "Non specificato"}
                        </span>
                      </div>
                      
                      {/* Created date */}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Creato il {new Date(wedding.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        asChild
                      >
                        <Link to={`/matrimoni/${wedding.id}`}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => startImpersonation(wedding.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Invitati
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && weddings?.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun matrimonio
                </h3>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                  Inizia creando il tuo primo matrimonio per gestire invitati, tavoli e RSVP
                </p>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Primo Matrimonio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matrimoni;
