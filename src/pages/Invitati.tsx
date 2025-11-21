import { useState, useEffect } from "react";
import { Users, Plus, CheckCircle, Clock, XCircle, Table2, Grid3x3, Phone, User, Crown, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

const Invitati = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'box'>(() => {
    const saved = localStorage.getItem('invitati-view-mode');
    return saved as 'table' | 'box' || (window.innerWidth >= 1024 ? 'table' : 'box');
  });
  const [selectedInvitato, setSelectedInvitato] = useState<any>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  
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

  // Pagination
  const itemsPerPage = isMobile ? 15 : 20;
  const totalPages = Math.ceil((invitati?.length || 0) / itemsPerPage);
  const paginatedData = invitati?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Invitati
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestisci gli invitati del matrimonio
            </p>
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

            {/* View Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
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
                      ) : paginatedData && paginatedData.length > 0 ? (
                        paginatedData.map((invitato) => (
                          <tr
                            key={invitato.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
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
                              <div className="text-sm text-gray-700">
                                {invitato.cellulare}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="text-sm text-gray-700">
                                {invitato.tipo_ospite}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                {invitato.famiglia ? (
                                  <>
                                    <span className="text-sm text-gray-700">
                                      {invitato.famiglia.nome}
                                    </span>
                                    {invitato.is_capo_famiglia && (
                                      <Badge className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">
                                        <Crown className="h-3 w-3 mr-1" />
                                        Capo
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </div>
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
                        ))
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <Skeleton className="h-6 w-32 mb-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : paginatedData && paginatedData.length > 0 ? (
                  paginatedData.map((invitato) => (
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
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{invitato.cellulare}</span>
                        </div>
                        
                        {invitato.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{invitato.email}</span>
                          </div>
                        )}
                        
                        {invitato.famiglia && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            <span>{invitato.famiglia.nome}</span>
                            {invitato.is_capo_famiglia && (
                              <Crown className="h-3 w-3 text-yellow-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
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
    </div>
  );
};

export default Invitati;
