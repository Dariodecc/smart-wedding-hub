import { useState, useEffect, useMemo } from "react";
import { Users, Plus, CheckCircle, Clock, XCircle, Table2, Grid3x3, Phone, User, Crown, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, SlidersHorizontal, X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddInvitatoDialog } from "@/components/AddInvitatoDialog";
import { EditInvitatoSheet } from "@/components/EditInvitatoSheet";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandSeparator } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Invitati = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'box'>(() => {
    const saved = localStorage.getItem('invitati-view-mode');
    return saved as 'table' | 'box' || (window.innerWidth >= 1024 ? 'table' : 'box');
  });
  const [selectedInvitato, setSelectedInvitato] = useState<any>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    tipo: 'all',
    famiglia: 'all',
    rsvp: 'all'
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  
  const { wedding, isLoading: isLoadingWedding } = useCurrentMatrimonio();
  const isMobile = useIsMobile();

  // Update view mode based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (!localStorage.getItem('invitati-view-mode')) {
        setViewMode(window.innerWidth >= 1024 ? 'table' : 'box');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save view mode preference
  const handleViewChange = (mode: 'table' | 'box') => {
    setViewMode(mode);
    localStorage.setItem('invitati-view-mode', mode);
  };

  const { data: invitati, isLoading: isLoadingInvitati } = useQuery({
    queryKey: ["invitati", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("invitati")
        .select(`
          *,
          famiglia:famiglie(id, nome)
        `)
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!wedding?.id,
  });

  const { data: famiglie } = useQuery({
    queryKey: ["famiglie", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("famiglie")
        .select("id, nome")
        .eq("wedding_id", wedding.id)
        .order("nome");
      
      if (error) throw error;
      return data;
    },
    enabled: !!wedding?.id,
  });

  const isLoading = isLoadingWedding || isLoadingInvitati;
  const hasGuests = invitati && invitati.length > 0;

  // Calculate statistics
  const stats = {
    total: invitati?.length || 0,
    confermati: invitati?.filter(i => i.rsvp_status === 'Ci sarò').length || 0,
    inAttesa: invitati?.filter(i => i.rsvp_status === 'In attesa').length || 0,
    declinati: invitati?.filter(i => i.rsvp_status === 'Non ci sarò').length || 0,
  };

  const getPercentage = (count: number) => {
    if (stats.total === 0) return 0;
    return ((count / stats.total) * 100).toFixed(0);
  };

  // Initialize tempFilters when mobile panel opens
  useEffect(() => {
    if (showMobileFilters) {
      setTempFilters(filters);
    }
  }, [showMobileFilters, filters]);

  // Filter invitati
  const filteredInvitati = useMemo(() => {
    if (!invitati) return [];
    
    let filtered = [...invitati];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.nome.toLowerCase().includes(searchLower) ||
        inv.cognome.toLowerCase().includes(searchLower)
      );
    }
    
    // Tipo filter
    if (filters.tipo !== 'all') {
      filtered = filtered.filter(inv => inv.tipo_ospite === filters.tipo);
    }
    
    // Famiglia filter
    if (filters.famiglia !== 'all') {
      if (filters.famiglia === 'singles') {
        filtered = filtered.filter(inv => !inv.famiglia_id);
      } else {
        filtered = filtered.filter(inv => inv.famiglia_id === filters.famiglia);
      }
    }
    
    // RSVP filter
    if (filters.rsvp !== 'all') {
      filtered = filtered.filter(inv => inv.rsvp_status === filters.rsvp);
    }
    
    return filtered;
  }, [invitati, filters]);

  // Process invitati to group by family
  const processedInvitati = useMemo(() => {
    if (!filteredInvitati) return [];
    
    const grouped: any[] = [];
    const singles: any[] = [];
    const familyMap = new Map();
    
    // Separate singles and family members
    filteredInvitati.forEach(invitato => {
      if (!invitato.famiglia_id) {
        singles.push(invitato);
      } else {
        if (!familyMap.has(invitato.famiglia_id)) {
          familyMap.set(invitato.famiglia_id, {
            famiglia: invitato.famiglia,
            membri: []
          });
        }
        familyMap.get(invitato.famiglia_id).membri.push(invitato);
      }
    });
    
    // Sort members: capo famiglia first, then others
    familyMap.forEach(group => {
      group.membri.sort((a: any, b: any) => {
        if (a.is_capo_famiglia) return -1;
        if (b.is_capo_famiglia) return 1;
        return 0;
      });
    });
    
    // Convert map to array and add to grouped
    Array.from(familyMap.values()).forEach(group => {
      grouped.push({
        type: 'family',
        famiglia: group.famiglia,
        membri: group.membri
      });
    });
    
    // Add singles at the end
    singles.forEach(invitato => {
      grouped.push({
        type: 'single',
        invitato: invitato
      });
    });
    
    return grouped;
  }, [filteredInvitati]);

  // Pagination
  const itemsPerPage = isMobile ? 15 : 20;
  const totalPages = Math.ceil((filteredInvitati?.length || 0) / itemsPerPage);
  
  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInvitatoClick = (invitato: any) => {
    setSelectedInvitato(invitato);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = () => {
    setIsEditSheetOpen(false);
    setSelectedInvitato(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nessun matrimonio associato</h2>
          <p className="text-muted-foreground">
            Non hai accesso a nessun matrimonio al momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-gray-600 hover:text-gray-900" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Invitati
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gestisci gli invitati del matrimonio
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Invitato
          </Button>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="p-6 space-y-6">

        {!hasGuests ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun invitato ancora
            </h2>
            <p className="text-gray-500 max-w-md">
              Inizia ad aggiungere i tuoi invitati al matrimonio
            </p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 - Totale Invitati */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Totale Invitati
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.total}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              {/* Card 2 - Confermati */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Confermati
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-bold text-gray-900">
                          {stats.confermati}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          ({getPercentage(stats.confermati)}%)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              {/* Card 3 - In Attesa */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      In Attesa
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-bold text-gray-900">
                          {stats.inAttesa}
                        </p>
                        <p className="text-sm font-medium text-yellow-600">
                          ({getPercentage(stats.inAttesa)}%)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              
              {/* Card 4 - Declinati */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Declinati
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-bold text-gray-900">
                          {stats.declinati}
                        </p>
                        <p className="text-sm font-medium text-red-600">
                          ({getPercentage(stats.declinati)}%)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* View Toggle & Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* View Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className={cn(
                      "rounded-lg",
                      viewMode === 'table' 
                        ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={() => handleViewChange('table')}
                  >
                    <Table2 className="h-4 w-4 mr-2" />
                    Tabella
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "rounded-lg",
                      viewMode === 'box' 
                        ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={() => handleViewChange('box')}
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Box
                  </Button>
                  
                  {/* Mobile Filter Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden border-gray-200 rounded-lg"
                    onClick={() => setShowMobileFilters(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Desktop Filters */}
                <div className="hidden lg:flex items-center gap-3 flex-1 justify-end">
                  {/* Search */}
                  <div className="relative w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca per nome o cognome..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-9 h-10 border-gray-200 rounded-lg"
                    />
                  </div>
                  
                  {/* Tipo Filter */}
                  <Select
                    value={filters.tipo}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger className="w-[150px] h-10 border-gray-200 rounded-lg">
                      <SelectValue placeholder="Tipo ospite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="Neonato">Neonato</SelectItem>
                      <SelectItem value="Bambino">Bambino</SelectItem>
                      <SelectItem value="Ragazzo">Ragazzo</SelectItem>
                      <SelectItem value="Adulto">Adulto</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Famiglia Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-[180px] h-10 justify-between border-gray-200 rounded-lg"
                      >
                        {filters.famiglia === 'all' 
                          ? "Tutte le famiglie" 
                          : filters.famiglia === 'singles'
                          ? "Invitati singoli"
                          : famiglie?.find(f => f.id === filters.famiglia)?.nome || "Famiglia"}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Cerca famiglia..." />
                        <CommandEmpty>Nessuna famiglia trovata</CommandEmpty>
                        <CommandGroup className="max-h-[250px] overflow-auto">
                          <CommandItem
                            onSelect={() => setFilters(prev => ({ ...prev, famiglia: 'all' }))}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filters.famiglia === 'all' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Tutte le famiglie
                          </CommandItem>
                          <CommandItem
                            onSelect={() => setFilters(prev => ({ ...prev, famiglia: 'singles' }))}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filters.famiglia === 'singles' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Invitati singoli
                          </CommandItem>
                          <CommandSeparator />
                          {famiglie?.map((famiglia) => (
                            <CommandItem
                              key={famiglia.id}
                              onSelect={() => setFilters(prev => ({ ...prev, famiglia: famiglia.id }))}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.famiglia === famiglia.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Users className="mr-2 h-3.5 w-3.5 text-gray-400" />
                              {famiglia.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* RSVP Filter */}
                  <Select
                    value={filters.rsvp}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, rsvp: value }))}
                  >
                    <SelectTrigger className="w-[160px] h-10 border-gray-200 rounded-lg">
                      <SelectValue placeholder="Stato RSVP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="Ci sarò">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Ci sarò
                        </div>
                      </SelectItem>
                      <SelectItem value="In attesa">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          In attesa
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
                  
                  {/* Clear Filters Button */}
                  {(filters.search || filters.tipo !== 'all' || filters.famiglia !== 'all' || filters.rsvp !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                      onClick={() => setFilters({ search: '', tipo: 'all', famiglia: 'all', rsvp: 'all' })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancella
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cognome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Cellulare
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Famiglia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RSVP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                            <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                          </tr>
                        ))
                      ) : processedInvitati && processedInvitati.length > 0 ? (
                        processedInvitati.map((item, index) => {
                          if (item.type === 'family') {
                            return (
                              <>
                                {/* Family Header Row */}
                                <tr key={`family-${item.famiglia.id}`} className="bg-purple-50 border-y border-purple-200">
                                  <td colSpan={6} className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-purple-600" />
                                      <span className="text-sm font-semibold text-purple-900">
                                        {item.famiglia.nome}
                                      </span>
                                      <span className="text-xs text-purple-600">
                                        ({item.membri.length} {item.membri.length === 1 ? 'ospite' : 'ospiti'})
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Family Members Rows */}
                                {item.membri.map((membro: any, membroIndex: number) => (
                                  <tr
                                    key={membro.id}
                                    className={cn(
                                      "hover:bg-gray-50 cursor-pointer transition-colors",
                                      membroIndex === item.membri.length - 1 && "border-b-2 border-gray-300"
                                    )}
                                    onClick={() => handleInvitatoClick(membro)}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        {membro.is_capo_famiglia && (
                                          <Crown className="h-3.5 w-3.5 text-yellow-600" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">
                                          {membro.nome}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {membro.cognome}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                      <a
                                        href={`https://wa.me/${membro.cellulare.replace(/[^0-9+]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                        {membro.cellulare}
                                      </a>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                      <div className="text-sm text-gray-700">
                                        {membro.tipo_ospite}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-700">
                                          {item.famiglia.nome}
                                        </span>
                                        {membro.is_capo_famiglia && (
                                          <Badge className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">
                                            Capo
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <Badge className={cn(
                                        "rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center",
                                        membro.rsvp_status === "Ci sarò" && "bg-green-100 text-green-800",
                                        membro.rsvp_status === "In attesa" && "bg-yellow-100 text-yellow-800",
                                        membro.rsvp_status === "Non ci sarò" && "bg-red-100 text-red-800"
                                      )}>
                                        <div className={cn(
                                          "w-1.5 h-1.5 rounded-full mr-1.5",
                                          membro.rsvp_status === "Ci sarò" && "bg-green-500",
                                          membro.rsvp_status === "In attesa" && "bg-yellow-500",
                                          membro.rsvp_status === "Non ci sarò" && "bg-red-500"
                                        )} />
                                        {membro.rsvp_status}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </>
                            );
                          } else {
                            // Single guest (no family)
                            const invitato = item.invitato;
                            return (
                              <tr
                                key={invitato.id}
                                className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-200"
                                onClick={() => handleInvitatoClick(invitato)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {invitato.nome}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {invitato.cognome}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <a
                                    href={`https://wa.me/${invitato.cellulare.replace(/[^0-9+]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                    {invitato.cellulare}
                                  </a>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                  <div className="text-sm text-gray-700">
                                    {invitato.tipo_ospite}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <span className="text-sm text-gray-400">-</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={cn(
                                    "rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center",
                                    invitato.rsvp_status === "Ci sarò" && "bg-green-100 text-green-800",
                                    invitato.rsvp_status === "In attesa" && "bg-yellow-100 text-yellow-800",
                                    invitato.rsvp_status === "Non ci sarò" && "bg-red-100 text-red-800"
                                  )}>
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full mr-1.5",
                                      invitato.rsvp_status === "Ci sarò" && "bg-green-500",
                                      invitato.rsvp_status === "In attesa" && "bg-yellow-500",
                                      invitato.rsvp_status === "Non ci sarò" && "bg-red-500"
                                    )} />
                                    {invitato.rsvp_status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          }
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            Nessun invitato trovato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Box View */}
            {viewMode === 'box' && (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <Skeleton className="h-6 w-32 mb-3" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : processedInvitati && processedInvitati.length > 0 ? (
                  processedInvitati.map((item) => {
                    if (item.type === 'family') {
                      return (
                        <div key={`family-${item.famiglia.id}`} className="space-y-3">
                          {/* Family Header */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-purple-600" />
                              <h3 className="text-base font-semibold text-purple-900">
                                {item.famiglia.nome}
                              </h3>
                              <span className="text-sm text-purple-600">
                                ({item.membri.length} {item.membri.length === 1 ? 'ospite' : 'ospiti'})
                              </span>
                            </div>
                          </div>
                          
                          {/* Family Members Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-6">
                            {item.membri.map((membro: any) => (
                              <div
                                key={membro.id}
                                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                                onClick={() => handleInvitatoClick(membro)}
                              >
                                {/* Capo famiglia indicator */}
                                {membro.is_capo_famiglia && (
                                  <div className="absolute -top-2 -left-2">
                                    <div className="bg-yellow-500 rounded-full p-1.5">
                                      <Crown className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                )}
                                
                                {/* Header with avatar and RSVP badge */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                      {membro.nome[0]}{membro.cognome[0]}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                        {membro.nome} {membro.cognome}
                                        {membro.is_capo_famiglia && (
                                          <Crown className="h-3 w-3 text-yellow-600" />
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {membro.tipo_ospite}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-medium",
                                    membro.rsvp_status === "Ci sarò" && "bg-green-100 text-green-800",
                                    membro.rsvp_status === "In attesa" && "bg-yellow-100 text-yellow-800",
                                    membro.rsvp_status === "Non ci sarò" && "bg-red-100 text-red-800"
                                  )}>
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full mr-1",
                                      membro.rsvp_status === "Ci sarò" && "bg-green-500",
                                      membro.rsvp_status === "In attesa" && "bg-yellow-500",
                                      membro.rsvp_status === "Non ci sarò" && "bg-red-500"
                                    )} />
                                    {membro.rsvp_status}
                                  </Badge>
                                </div>
                                
                                {/* Details */}
                                <div className="space-y-2">
                                  <a
                                    href={`https://wa.me/${membro.cellulare.replace(/[^0-9+]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{membro.cellulare}</span>
                                  </a>
                                  
                                  {membro.email && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="truncate">{membro.email}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2 text-xs text-purple-600">
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="font-medium">{item.famiglia.nome}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      // Single guest card
                      const invitato = item.invitato;
                      return (
                        <div
                          key={invitato.id}
                          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
                          onClick={() => handleInvitatoClick(invitato)}
                        >
                          {/* Header with avatar and RSVP badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {invitato.nome[0]}{invitato.cognome[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {invitato.nome} {invitato.cognome}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {invitato.tipo_ospite}
                                </p>
                              </div>
                            </div>
                            <Badge className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0",
                              invitato.rsvp_status === "Ci sarò" && "bg-green-100 text-green-800",
                              invitato.rsvp_status === "In attesa" && "bg-yellow-100 text-yellow-800",
                              invitato.rsvp_status === "Non ci sarò" && "bg-red-100 text-red-800"
                            )}>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full mr-1",
                                invitato.rsvp_status === "Ci sarò" && "bg-green-500",
                                invitato.rsvp_status === "In attesa" && "bg-yellow-500",
                                invitato.rsvp_status === "Non ci sarò" && "bg-red-500"
                              )} />
                              {invitato.rsvp_status}
                            </Badge>
                          </div>
                          
                          {/* Details */}
                          <div className="space-y-2">
                            <a
                              href={`https://wa.me/${invitato.cellulare.replace(/[^0-9+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>{invitato.cellulare}</span>
                            </a>
                            
                            {invitato.email && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{invitato.email}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Users className="h-3.5 w-3.5" />
                              <span className="italic">Invitato singolo</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nessun invitato trovato
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, stats.total)}</span> di{' '}
                    <span className="font-medium">{stats.total}</span> risultati
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 rounded-lg h-9 w-9 p-0"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 rounded-lg h-9 w-9 p-0"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page numbers */}
                    {!isMobile && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          )
                          .map((page, idx, arr) => (
                            <div key={page} className="flex items-center">
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "rounded-lg min-w-[36px] h-9",
                                  page === currentPage 
                                    ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white" 
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                )}
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 rounded-lg h-9 w-9 p-0"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 rounded-lg h-9 w-9 p-0"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AddInvitatoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        weddingId={wedding.id}
      />

      {/* Edit Sheet */}
      {selectedInvitato && (
        <EditInvitatoSheet
          invitato={selectedInvitato}
          isOpen={isEditSheetOpen}
          onClose={handleCloseEditSheet}
          matrimonioId={wedding.id}
        />
      )}

      {/* Mobile Filter Panel */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="right" className="w-full h-full p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 border-b border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Filtri</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Filtra gli invitati per trovare ciò che cerchi
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowMobileFilters(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Filter Form */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
            <div className="space-y-6 pb-24">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">Cerca</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Nome o cognome..."
                    value={tempFilters.search}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 h-12 text-base border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              
              <Separator className="bg-gray-200" />
              
              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">Tipo Ospite</Label>
                <Select
                  value={tempFilters.tipo}
                  onValueChange={(value) => setTempFilters(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger className="h-12 text-base border-gray-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="h-12 text-base">Tutti i tipi</SelectItem>
                    <SelectItem value="Neonato" className="h-12 text-base">Neonato</SelectItem>
                    <SelectItem value="Bambino" className="h-12 text-base">Bambino</SelectItem>
                    <SelectItem value="Ragazzo" className="h-12 text-base">Ragazzo</SelectItem>
                    <SelectItem value="Adulto" className="h-12 text-base">Adulto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator className="bg-gray-200" />
              
              {/* Famiglia */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">Famiglia</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-12 justify-between text-base border-gray-200 rounded-lg"
                    >
                      {tempFilters.famiglia === 'all' 
                        ? "Tutte le famiglie"
                        : tempFilters.famiglia === 'singles'
                        ? "Invitati singoli"
                        : famiglie?.find(f => f.id === tempFilters.famiglia)?.nome || "Famiglia"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[calc(100vw-3rem)] p-0" 
                    align="start"
                    side="bottom"
                  >
                    <Command>
                      <CommandInput placeholder="Cerca famiglia..." className="h-12" />
                      <CommandEmpty>Nessuna famiglia trovata</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        <CommandItem
                          onSelect={() => setTempFilters(prev => ({ ...prev, famiglia: 'all' }))}
                          className="h-12"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              tempFilters.famiglia === 'all' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Tutte le famiglie
                        </CommandItem>
                        <CommandItem
                          onSelect={() => setTempFilters(prev => ({ ...prev, famiglia: 'singles' }))}
                          className="h-12"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              tempFilters.famiglia === 'singles' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Invitati singoli
                        </CommandItem>
                        <CommandSeparator />
                        {famiglie?.map((famiglia) => (
                          <CommandItem
                            key={famiglia.id}
                            onSelect={() => setTempFilters(prev => ({ ...prev, famiglia: famiglia.id }))}
                            className="h-12"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                tempFilters.famiglia === famiglia.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Users className="mr-2 h-4 w-4 text-gray-400" />
                            {famiglia.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <Separator className="bg-gray-200" />
              
              {/* RSVP */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">Stato RSVP</Label>
                <Select
                  value={tempFilters.rsvp}
                  onValueChange={(value) => setTempFilters(prev => ({ ...prev, rsvp: value }))}
                >
                  <SelectTrigger className="h-12 text-base border-gray-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="h-12 text-base">Tutti gli stati</SelectItem>
                    <SelectItem value="Ci sarò" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Ci sarò
                      </div>
                    </SelectItem>
                    <SelectItem value="In attesa" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        In attesa
                      </div>
                    </SelectItem>
                    <SelectItem value="Non ci sarò" className="h-12 text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Non ci sarò
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 border-gray-200 rounded-lg"
                onClick={() => {
                  setTempFilters({ search: '', tipo: 'all', famiglia: 'all', rsvp: 'all' });
                  setFilters({ search: '', tipo: 'all', famiglia: 'all', rsvp: 'all' });
                  setShowMobileFilters(false);
                }}
              >
                <X className="h-5 w-5 mr-2" />
                Cancella Filtri
              </Button>
              <Button
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                onClick={() => {
                  setFilters(tempFilters);
                  setShowMobileFilters(false);
                }}
              >
                <Check className="h-5 w-5 mr-2" />
                Applica
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Invitati;
