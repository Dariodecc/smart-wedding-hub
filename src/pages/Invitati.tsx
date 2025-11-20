import { useState, useEffect } from "react";
import { Users, Plus, CheckCircle, Clock, XCircle, Table2, Grid3x3, Phone, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddInvitatoDialog } from "@/components/AddInvitatoDialog";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Invitati = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'box'>(() => {
    const saved = localStorage.getItem('invitati-view-mode');
    return saved as 'table' | 'box' || (window.innerWidth >= 1024 ? 'table' : 'box');
  });
  
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
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Invitati</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Invitato
        </Button>
      </div>

      {!hasGuests ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Nessun invitato ancora
          </h2>
          <p className="text-muted-foreground max-w-md">
            Inizia ad aggiungere i tuoi invitati al matrimonio
          </p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-background border rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Totale Invitati</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.total}</p>
              )}
            </div>

            <div className="bg-background border rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Confermati</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">
                  {stats.confermati} <span className="text-sm text-muted-foreground">({getPercentage(stats.confermati)}%)</span>
                </p>
              )}
            </div>

            <div className="bg-background border rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-muted-foreground">In Attesa</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">
                  {stats.inAttesa} <span className="text-sm text-muted-foreground">({getPercentage(stats.inAttesa)}%)</span>
                </p>
              )}
            </div>

            <div className="bg-background border rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-muted-foreground">Declinati</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">
                  {stats.declinati} <span className="text-sm text-muted-foreground">({getPercentage(stats.declinati)}%)</span>
                </p>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, stats.total)} di {stats.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('table')}
              >
                <Table2 className="h-4 w-4 mr-2" />
                Tabella
              </Button>
              <Button
                variant={viewMode === 'box' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('box')}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Box
              </Button>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead className="hidden sm:table-cell">Cellulare</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo di Ospite</TableHead>
                    <TableHead className="hidden sm:table-cell">Famiglia</TableHead>
                    <TableHead>RSVP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedData && paginatedData.length > 0 ? (
                    paginatedData.map((invitato) => (
                      <TableRow key={invitato.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{invitato.nome}</TableCell>
                        <TableCell>{invitato.cognome}</TableCell>
                        <TableCell className="hidden sm:table-cell">{invitato.cellulare}</TableCell>
                        <TableCell className="hidden md:table-cell">{invitato.tipo_ospite}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {invitato.famiglia ? (
                            <div className="flex items-center gap-2">
                              <span>{invitato.famiglia.nome}</span>
                              {invitato.is_capo_famiglia && (
                                <Crown className="h-3 w-3 text-yellow-600" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invitato.rsvp_status === 'Ci sarò' ? 'default' :
                              invitato.rsvp_status === 'Non ci sarò' ? 'destructive' :
                              'secondary'
                            }
                            className={
                              invitato.rsvp_status === 'Ci sarò' ? 'bg-green-600 hover:bg-green-700' :
                              invitato.rsvp_status === 'In attesa' ? 'bg-orange-600 hover:bg-orange-700' :
                              ''
                            }
                          >
                            {invitato.rsvp_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nessun invitato trovato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Box View */}
          {viewMode === 'box' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-background border rounded-lg p-4 shadow-sm">
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
                    className="bg-background border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                          {invitato.nome} {invitato.cognome}
                        </h3>
                        {invitato.is_capo_famiglia && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Capo
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{invitato.cellulare}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span>{invitato.tipo_ospite}</span>
                        </div>

                        {invitato.famiglia && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{invitato.famiglia.nome}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs font-medium text-foreground">RSVP:</span>
                          <Badge
                            variant={
                              invitato.rsvp_status === 'Ci sarò' ? 'default' :
                              invitato.rsvp_status === 'Non ci sarò' ? 'destructive' :
                              'secondary'
                            }
                            className={
                              invitato.rsvp_status === 'Ci sarò' ? 'bg-green-600 hover:bg-green-700' :
                              invitato.rsvp_status === 'In attesa' ? 'bg-orange-600 hover:bg-orange-700' :
                              ''
                            }
                          >
                            {invitato.rsvp_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nessun invitato trovato
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(totalPages, isMobile ? 3 : 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= (isMobile ? 3 : 5)) {
                      pageNum = i + 1;
                    } else if (currentPage <= (isMobile ? 2 : 3)) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - (isMobile ? 1 : 2)) {
                      pageNum = totalPages - (isMobile ? 2 : 4) + i;
                    } else {
                      pageNum = currentPage - (isMobile ? 1 : 2) + i;
                    }

                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <AddInvitatoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        weddingId={wedding.id}
      />
    </div>
  );
};

export default Invitati;
