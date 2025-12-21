import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, RefreshCw, Users, UserCog, Heart, UserX, Trash2, Search, Filter, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  wedding_id?: string;
  wedding_name?: string;
}

const Utenti = () => {
  const { t } = useTranslation('utenti');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [weddingFilter, setWeddingFilter] = useState<string>("all");
  const [weddingFilterOpen, setWeddingFilterOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "sposi" as "admin" | "sposi",
    weddingId: "",
    isActive: true,
  });

  // Fetch all users with their roles and profiles
  const { data: users = [], isLoading, error: usersError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        throw new Error('No valid session');
      }
      
      const { data, error } = await supabase.functions.invoke("list-users", {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;
      return data.users as UserData[];
    },
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    if (usersError) {
      const errorMessage = usersError?.message || '';
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('No valid session')) {
        toast.error(t('toast.sessionExpired'));
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }
  }, [usersError, t]);

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

  // Filtered users based on search and wedding filter
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Wedding filter
      let matchesWedding = true;
      if (weddingFilter === "none") {
        matchesWedding = !u.wedding_id;
      } else if (weddingFilter !== "all") {
        matchesWedding = u.wedding_id === weddingFilter;
      }
      
      return matchesSearch && matchesWedding;
    });
  }, [users, searchQuery, weddingFilter]);

  // Calculate statistics
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    sposi: users.filter(u => u.role === "sposi").length,
    disabled: users.filter(u => !u.is_active).length,
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
    toast.success(t('toast.passwordGenerated'));
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: checkResult, error: checkError } = await supabase.functions.invoke("check-user", {
        body: { action: "check", email: data.email },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (checkError) throw checkError;
      if (checkResult?.exists) throw new Error("userExists");

      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create",
          email: data.email,
          password: data.password,
          role: data.role,
          weddingId: data.role === "sposi" ? data.weddingId : undefined,
          isActive: data.isActive,
        },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(t('toast.created'));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error.message === "userExists") {
        toast.warning(t('toast.userExists'), {
          description: t('toast.userExistsDescription')
        });
      } else {
        toast.error(`${t('toast.errorCreating')}: ${error.message}`);
      }
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
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(t('toast.updated'));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.refetchQueries({ queryKey: ["users"] });
      setIsEditOpen(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`${t('toast.errorUpdating')}: ${error.message}`);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", userId },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDeleteOpen(false);
      setDeletingUser(null);
    },
    onError: (error) => {
      toast.error(`${t('toast.errorDeleting')}: ${error.message}`);
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

  const clearFilters = () => {
    setSearchQuery("");
    setWeddingFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || weddingFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                {t('title')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('addUser')}</span>
            <span className="sm:hidden">{t('addUserShort')}</span>
          </Button>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createUser')}</DialogTitle>
            <DialogDescription>{t('createUserDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">
                {t('form.email.label')} {t('form.email.required')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">
                {t('form.password.label')} {t('form.password.required')}
              </Label>
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
                <Button type="button" variant="outline" onClick={generatePassword} title={t('form.password.generate')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="role">
                {t('form.role.label')} {t('form.role.required')}
              </Label>
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
                  <SelectItem value="admin">{t('form.role.admin')}</SelectItem>
                  <SelectItem value="sposi">{t('form.role.sposi')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "sposi" && (
              <div>
                <Label htmlFor="wedding">{t('form.wedding.label')}</Label>
                <Select
                  value={formData.weddingId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weddingId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.wedding.placeholder')} />
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
                {t('form.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? t('form.buttons.creating') : t('form.buttons.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{t('stats.total.title')}</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">{t('stats.total.description')}</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{t('stats.admin.title')}</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.admin}</div>
                <p className="text-xs text-gray-500 mt-1">{t('stats.admin.description')}</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{t('stats.sposi.title')}</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-pink-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.sposi}</div>
                <p className="text-xs text-gray-500 mt-1">{t('stats.sposi.description')}</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{t('stats.disabled.title')}</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.disabled}</div>
                <p className="text-xs text-gray-500 mt-1">{t('stats.disabled.description')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          <Card className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-4">
                {/* Title and filters row */}
                <div className="flex items-center justify-between">
                  <CardTitle>{t('list.title')}</CardTitle>
                  
                  {/* Clear filters button */}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4 mr-1" />
                      {t('list.filter.clearFilters')}
                    </Button>
                  )}
                </div>
                
                {/* Search and Filter controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t('list.search.placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Wedding Filter */}
                  <Popover open={weddingFilterOpen} onOpenChange={setWeddingFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full sm:w-[250px] justify-between h-10",
                          weddingFilter !== "all" && "border-pink-300 bg-pink-50"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Filter className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="truncate">
                            {weddingFilter === "all" 
                              ? t('list.filter.wedding')
                              : weddingFilter === "none"
                              ? t('list.filter.noWedding')
                              : weddings.find(w => w.id === weddingFilter)?.couple_name
                            }
                          </span>
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                      <Command>
                        <CommandInput placeholder={t('list.filter.searchWedding')} />
                        <CommandList>
                          <CommandEmpty>{t('list.search.noResults')}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setWeddingFilter("all");
                                setWeddingFilterOpen(false);
                              }}
                            >
                              <span className={cn(weddingFilter === "all" && "font-semibold")}>
                                {t('list.filter.allWeddings')}
                              </span>
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                setWeddingFilter("none");
                                setWeddingFilterOpen(false);
                              }}
                            >
                              <span className={cn(weddingFilter === "none" && "font-semibold")}>
                                {t('list.filter.noWedding')}
                              </span>
                            </CommandItem>
                            {weddings.map((wedding) => (
                              <CommandItem
                                key={wedding.id}
                                onSelect={() => {
                                  setWeddingFilter(wedding.id);
                                  setWeddingFilterOpen(false);
                                }}
                              >
                                <span className={cn(weddingFilter === wedding.id && "font-semibold")}>
                                  {wedding.couple_name}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">{t('list.loading')}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('list.empty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((currentUser) => {
                    const isCurrentUser = currentUser.id === user?.id;
                    
                    return (
                      <div
                        key={currentUser.id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div 
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => openEditDialog(currentUser)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{currentUser.email}</p>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                {t('list.you')}
                              </Badge>
                            )}
                            <Badge 
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                currentUser.role === "admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-pink-100 text-pink-700"
                              )}
                            >
                              {currentUser.role === "admin" ? t('form.role.admin') : t('form.role.sposi')}
                            </Badge>
                            {!currentUser.is_active && (
                              <Badge variant="destructive" className="text-xs">
                                {t('list.disabled')}
                              </Badge>
                            )}
                          </div>
                          {currentUser.wedding_name && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {t('list.wedding')}: {currentUser.wedding_name}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingUser(currentUser);
                            setIsDeleteOpen(true);
                          }}
                          disabled={isCurrentUser}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-2"
                          title={isCurrentUser ? t('deleteDialog.cannotDeleteSelf') : t('deleteUser')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editUser')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-email">
                {t('form.email.label')} {t('form.email.required')}
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-password">{t('form.password.leaveEmpty')}</Label>
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
                <Button type="button" variant="outline" onClick={generatePassword} title={t('form.password.generate')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-role">
                {t('form.role.label')} {t('form.role.required')}
              </Label>
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
                  <SelectItem value="admin">{t('form.role.admin')}</SelectItem>
                  <SelectItem value="sposi">{t('form.role.sposi')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "sposi" && (
              <div>
                <Label htmlFor="edit-wedding">{t('form.wedding.label')}</Label>
                <Select
                  value={formData.weddingId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weddingId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.wedding.placeholder')} />
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
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">
                  {t('form.status.label')}
                </Label>
                <div className="text-sm text-muted-foreground">
                  {formData.isActive ? t('form.status.enabled') : t('form.status.disabled')}
                </div>
              </div>
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                disabled={editingUser?.id === user?.id}
              />
            </div>

            {editingUser?.id === user?.id && (
              <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                ℹ️ {t('form.cannotDisableSelf')}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                {t('form.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? t('form.buttons.saving') : t('form.buttons.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteUserConfirm')} <strong>{deletingUser?.email}</strong>?
              {' '}{t('deleteUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDeleteOpen(false);
                setDeletingUser(null);
              }}
            >
              {t('form.buttons.cancel')}
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => {
                if (deletingUser) {
                  deleteUserMutation.mutate(deletingUser.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? t('form.buttons.deleting') : t('form.buttons.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Utenti;
