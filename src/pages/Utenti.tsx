import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, RefreshCw, Users, UserCog, Heart, UserX } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UserData {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  wedding_id?: string;
  wedding_name?: string;
}

const Utenti = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "sposi" as "admin" | "sposi",
    weddingId: "",
    isActive: true,
  });

  // Fetch all users with their roles and profiles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("list-users", {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      return data.users as UserData[];
    },
  });

  // Fetch weddings for the select
  const { data: weddings = [] } = useQuery({
    queryKey: ["weddings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("id, couple_name")
        .order("couple_name");

      if (error) throw error;
      return data;
    },
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    sposi: users.filter(u => u.role === "sposi").length,
    expired: users.filter(u => !u.is_active).length,
  };

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
    toast.success("Password generata");
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create",
          email: data.email,
          password: data.password,
          role: data.role,
          weddingId: data.role === "sposi" ? data.weddingId : undefined,
          isActive: data.isActive,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Utente creato con successo");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Errore durante la creazione: ${error.message}`);
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData & { userId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          userId: data.userId,
          email: data.email,
          password: data.password || undefined,
          role: data.role,
          weddingId: data.role === "sposi" ? data.weddingId : null,
          isActive: data.isActive,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Utente aggiornato con successo");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsEditOpen(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Errore durante l'aggiornamento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      role: "sposi",
      weddingId: "",
      isActive: true,
    });
    setShowPassword(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({ ...formData, userId: editingUser.id });
    }
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      role: user.role as "admin" | "sposi",
      weddingId: user.wedding_id || "",
      isActive: user.is_active,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">Utenti</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Utente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Utente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="role">Ruolo *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "sposi") => 
                    setFormData(prev => ({ ...prev, role: value, weddingId: value === "admin" ? "" : prev.weddingId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sposi">Sposi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "sposi" && (
                <div>
                  <Label htmlFor="wedding">Matrimonio</Label>
                  <Select
                    value={formData.weddingId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, weddingId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona matrimonio" />
                    </SelectTrigger>
                    <SelectContent>
                      {weddings.map((wedding) => (
                        <SelectItem key={wedding.id} value={wedding.id}>
                          {wedding.couple_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creazione..." : "Crea Utente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totale Utenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sposi</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sposi}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disabilitati</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Utenti</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Caricamento...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun utente trovato
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => openEditDialog(user)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.email}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === "admin" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-secondary/10 text-secondary-foreground"
                      }`}>
                        {user.role}
                      </span>
                      {!user.is_active && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                          Disabilitato
                        </span>
                      )}
                    </div>
                    {user.wedding_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Matrimonio: {user.wedding_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-password">Password (lascia vuoto per non modificare)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="edit-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-role">Ruolo *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "sposi") => 
                  setFormData(prev => ({ ...prev, role: value, weddingId: value === "admin" ? "" : prev.weddingId }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sposi">Sposi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "sposi" && (
              <div>
                <Label htmlFor="edit-wedding">Matrimonio</Label>
                <Select
                  value={formData.weddingId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weddingId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona matrimonio" />
                  </SelectTrigger>
                  <SelectContent>
                    {weddings.map((wedding) => (
                      <SelectItem key={wedding.id} value={wedding.id}>
                        {wedding.couple_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Stato Utenza</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formData.isActive ? "Abilitata" : "Disabilitata"}
                </span>
                <Switch
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Utenti;