import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, RotateCw, LogOut } from 'lucide-react';
import TavoloSVG from '@/components/tavoli/TavoloSVG';
import { GuestTooltip } from '@/components/tavoli/GuestTooltip';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

const SESSION_KEY = 'wedding-config-auth';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Tavolo {
  id: string;
  nome: string;
  tipo: 'rotondo' | 'rettangolare_singolo' | 'rettangolare_doppio';
  capienza: number;
  posizione_x: number;
  posizione_y: number;
  rotazione: number;
}

export default function ConfigurazioneTavoli() {
  const [searchParams] = useSearchParams();
  const weddingId = searchParams.get('w');
  const queryClient = useQueryClient();

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    
    try {
      const { weddingId: storedWeddingId, expiresAt } = JSON.parse(stored);
      
      // Check if session is still valid and for the same wedding
      if (storedWeddingId === weddingId && Date.now() < expiresAt) {
        console.log('✅ Valid session found, auto-authenticating');
        return true;
      } else {
        console.log('❌ Session expired or different wedding');
        localStorage.removeItem(SESSION_KEY);
        return false;
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredGuest, setHoveredGuest] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isInitialViewSet, setIsInitialViewSet] = useState(false);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [tableDragStart, setTableDragStart] = useState({ x: 0, y: 0, tableX: 0, tableY: 0 });
  const [localTavoli, setLocalTavoli] = useState<Tavolo[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const [weddingCoupleName, setWeddingCoupleName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);

  // Check password using secure verification function (doesn't expose password)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!weddingId || !password.trim()) {
      toast.error('Inserisci una password');
      return;
    }

    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase
        .rpc('verify_wedding_password', { 
          _wedding_id: weddingId,
          _password_attempt: password.trim()
        });

      if (error) {
        console.error('❌ Error verifying password:', error);
        toast.error('Errore nella verifica della password');
        return;
      }

      const result = data?.[0];
      
      if (!result) {
        toast.error('Matrimonio non trovato');
        return;
      }

      setWeddingCoupleName(result.couple_name);

      if (result.verified) {
        // Save session to localStorage
        const session = {
          weddingId,
          expiresAt: Date.now() + SESSION_DURATION,
          authenticatedAt: Date.now()
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        // Store verified password for RPC calls
        setVerifiedPassword(password.trim());
        
        setIsAuthenticated(true);
        toast.success('Accesso consentito - sessione valida per 7 giorni');
      } else {
        toast.error('Password errata');
      }
    } catch (error) {
      console.error('❌ Password verification error:', error);
      toast.error('Errore nella verifica');
    } finally {
      setIsVerifying(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setVerifiedPassword(null);
    setIsAuthenticated(false);
    toast.success('Disconnesso');
  };

  // Fetch tables
  const { data: tavoli = [], isLoading: tavoliLoading } = useQuery({
    queryKey: ['tavoli-public', weddingId],
    queryFn: async () => {
      console.log('🔍 Fetching tables for wedding:', weddingId);
      
      const { data, error } = await supabase
        .from('tavoli')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at');

      if (error) {
        console.error('❌ Error fetching tables:', error);
        throw error;
      }
      
      console.log('✅ Tables loaded:', data?.length, 'tables');
      console.log('📋 Tables data:', data);
      return data as Tavolo[];
    },
    enabled: isAuthenticated && !!weddingId,
  });

  // Fetch guests using secure password-validated RPC function
  const { data: invitati = [], isLoading: invitatiLoading } = useQuery({
    queryKey: ['invitati-public', weddingId, verifiedPassword],
    queryFn: async () => {
      if (!verifiedPassword) {
        console.log('⚠️ No verified password, cannot fetch guests');
        return [];
      }
      
      console.log('🔍 Fetching guests for wedding:', weddingId);
      
      // Use secure RPC function that requires password verification
      const { data: guests, error: guestsError } = await supabase
        .rpc('get_wedding_guests_secure', {
          _wedding_id: weddingId,
          _password_attempt: verifiedPassword
        });

      if (guestsError) {
        console.error('❌ Error fetching guests:', guestsError);
        throw guestsError;
      }

      // Fetch famiglie using secure RPC
      const { data: famiglie, error: famiglieError } = await supabase
        .rpc('get_wedding_famiglie_secure', {
          _wedding_id: weddingId,
          _password_attempt: verifiedPassword
        });

      if (famiglieError) {
        console.error('❌ Error fetching famiglie:', famiglieError);
      }

      // Fetch gruppi using secure RPC  
      const { data: gruppi, error: gruppiError } = await supabase
        .rpc('get_wedding_gruppi_secure', {
          _wedding_id: weddingId,
          _password_attempt: verifiedPassword
        });

      if (gruppiError) {
        console.error('❌ Error fetching gruppi:', gruppiError);
      }

      // Map famiglia and gruppo data to guests
      const famiglieMap = new Map((famiglie || []).map((f: any) => [f.id, f]));
      const gruppiMap = new Map((gruppi || []).map((g: any) => [g.id, g]));

      const enrichedGuests = (guests || []).map((guest: any) => ({
        ...guest,
        famiglie: guest.famiglia_id ? famiglieMap.get(guest.famiglia_id) : null,
        gruppi: guest.gruppo_id ? gruppiMap.get(guest.gruppo_id) : null
      }));
      
      console.log('✅ Guests loaded:', enrichedGuests.length, 'guests');
      return enrichedGuests;
    },
    enabled: isAuthenticated && !!weddingId && !!verifiedPassword,
  });

  // Get assignments for table
  const getAssignmentsForTable = (tavoloId: string) => {
    const assignments: Record<number, { guest: any }> = {};
    invitati
      .filter((g) => g.tavolo_id === tavoloId && g.posto_numero !== null)
      .forEach((guest) => {
        assignments[guest.posto_numero!] = { guest };
      });

    return assignments;
  };

  // Sync local tavoli with query data
  useEffect(() => {
    setLocalTavoli(tavoli);
  }, [tavoli]);

  // Debug state
  useEffect(() => {
    console.log('📊 Component state:', {
      isAuthenticated,
      weddingId,
      tavoliCount: tavoli.length,
      invitatiCount: invitati.length,
      tavoliLoading,
      invitatiLoading,
      zoom,
      panOffset
    });
  }, [isAuthenticated, weddingId, tavoli, invitati, tavoliLoading, invitatiLoading, zoom, panOffset]);

  // Session expiry warning
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    
    try {
      const { expiresAt } = JSON.parse(stored);
      const timeLeft = expiresAt - Date.now();
      
      // Warn 1 hour before expiry
      const warningTime = timeLeft - (60 * 60 * 1000);
      
      if (warningTime > 0) {
        const warningTimeout = setTimeout(() => {
          toast.warning('La tua sessione scadrà tra 1 ora', {
            duration: 5000
          });
        }, warningTime);
        
        return () => clearTimeout(warningTimeout);
      }
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  // Auto-center view on load
  useEffect(() => {
    if (localTavoli.length > 0 && !isInitialViewSet && canvasRef.current) {
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;

      localTavoli.forEach((tavolo) => {
        const padding = 300;
        minX = Math.min(minX, tavolo.posizione_x - padding);
        maxX = Math.max(maxX, tavolo.posizione_x + padding);
        minY = Math.min(minY, tavolo.posizione_y - padding);
        maxY = Math.max(maxY, tavolo.posizione_y + padding);
      });

      const width = maxX - minX;
      const height = maxY - minY;
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;

      const zoomX = canvasWidth / width;
      const zoomY = canvasHeight / height;
      const newZoom = Math.min(zoomX, zoomY, 1.2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setPanOffset({
        x: centerX - canvasWidth / (2 * newZoom),
        y: centerY - canvasHeight / (2 * newZoom),
      });

      setZoom(newZoom);
      setIsInitialViewSet(true);
    }
  }, [localTavoli, isInitialViewSet]);

  // Rotation handler with save - uses secure RPC function
  const rotateTable = async (degrees: number) => {
    if (!selectedTableId || !weddingId || !verifiedPassword) return;

    const tavolo = localTavoli.find((t) => t.id === selectedTableId);
    if (!tavolo) return;

    const currentRotation = tavolo.rotazione || 0;
    const newRotation = currentRotation + degrees;

    console.log('🔄 Rotating table:', { current: currentRotation, new: newRotation });

    // Update locally first for immediate feedback
    setLocalTavoli(prev => prev.map(t =>
      t.id === selectedTableId
        ? { ...t, rotazione: newRotation }
        : t
    ));

    // Save to database using secure RPC function
    try {
      const { data, error } = await supabase.rpc('update_tavolo_position', {
        _tavolo_id: selectedTableId,
        _wedding_id: weddingId,
        _password_attempt: verifiedPassword,
        _posizione_x: tavolo.posizione_x,
        _posizione_y: tavolo.posizione_y,
        _rotazione: newRotation
      });

      if (error) throw error;
      if (!data) throw new Error('Password verification failed');

      // Invalidate query to refresh from server
      await queryClient.invalidateQueries({ queryKey: ['tavoli-public', weddingId] });

      toast.success(`Tavolo ruotato di ${degrees}°`);
    } catch (error) {
      console.error('Error rotating table:', error);
      toast.error('Errore nella rotazione del tavolo');

      // Revert on error
      setLocalTavoli(tavoli);
    }
  };

  // Table drag handlers
  const handleTableDragStart = (tavoloId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const tavolo = localTavoli.find(t => t.id === tavoloId);
    if (!tavolo) return;

    setSelectedTableId(tavoloId);
    setIsDraggingTable(true);

    const svg = (e.target as SVGElement).ownerSVGElement;
    if (!svg) return;

    // Get SVG coordinates accounting for pan and zoom
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setTableDragStart({
      x: svgP.x,
      y: svgP.y,
      tableX: tavolo.posizione_x,
      tableY: tavolo.posizione_y
    });

    console.log('🎯 Started dragging table:', tavoloId);
  };

  const handleTableDragMove = (e: React.MouseEvent) => {
    if (!isDraggingTable || !selectedTableId) return;

    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const deltaX = svgP.x - tableDragStart.x;
    const deltaY = svgP.y - tableDragStart.y;

    // Update table position locally
    setLocalTavoli(prev => prev.map(t =>
      t.id === selectedTableId
        ? {
            ...t,
            posizione_x: tableDragStart.tableX + deltaX,
            posizione_y: tableDragStart.tableY + deltaY
          }
        : t
    ));
  };

  // Table drag end - uses secure RPC function
  const handleTableDragEnd = async () => {
    if (!isDraggingTable || !selectedTableId || !weddingId || !verifiedPassword) return;

    setIsDraggingTable(false);

    const tavolo = localTavoli.find(t => t.id === selectedTableId);
    if (!tavolo) return;

    // Check if position actually changed
    const originalTable = tavoli.find(t => t.id === selectedTableId);
    if (!originalTable) return;

    const positionChanged =
      Math.abs(tavolo.posizione_x - originalTable.posizione_x) > 1 ||
      Math.abs(tavolo.posizione_y - originalTable.posizione_y) > 1;

    if (!positionChanged) {
      console.log('⏭️ Position unchanged, not saving');
      return;
    }

    console.log('💾 Saving new position:', {
      tableId: selectedTableId,
      x: tavolo.posizione_x,
      y: tavolo.posizione_y
    });

    // Save to database using secure RPC function
    try {
      const { data, error } = await supabase.rpc('update_tavolo_position', {
        _tavolo_id: selectedTableId,
        _wedding_id: weddingId,
        _password_attempt: verifiedPassword,
        _posizione_x: tavolo.posizione_x,
        _posizione_y: tavolo.posizione_y,
        _rotazione: tavolo.rotazione
      });

      if (error) throw error;
      if (!data) throw new Error('Password verification failed');

      // Invalidate query to refresh from server
      await queryClient.invalidateQueries({ queryKey: ['tavoli-public', weddingId] });

      toast.success('Posizione tavolo salvata');
    } catch (error) {
      console.error('Error saving table position:', error);
      toast.error('Errore nel salvare la posizione');

      // Revert on error
      setLocalTavoli(tavoli);
    }
  };

  // Reset view
  const handleResetView = () => {
    if (localTavoli.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    localTavoli.forEach((tavolo) => {
      const padding = 300;
      minX = Math.min(minX, tavolo.posizione_x - padding);
      maxX = Math.max(maxX, tavolo.posizione_x + padding);
      minY = Math.min(minY, tavolo.posizione_y - padding);
      maxY = Math.max(maxY, tavolo.posizione_y + padding);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    const zoomX = canvasWidth / width;
    const zoomY = canvasHeight / height;
    const newZoom = Math.min(zoomX, zoomY, 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPanOffset({
      x: centerX - canvasWidth / (2 * newZoom),
      y: centerY - canvasHeight / (2 * newZoom),
    });

    setZoom(newZoom);
    toast.success('Vista centrata');
  };

  // Pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Check if clicking on empty space (not on a table)
    if (
      e.target === e.currentTarget ||
      (e.target as Element).tagName === 'svg' ||
      (e.target as Element).tagName === 'rect'
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX + panOffset.x, y: e.clientY + panOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingTable) {
      handleTableDragMove(e);
    } else if (isPanning) {
      setPanOffset({
        x: panStart.x - e.clientX,
        y: panStart.y - e.clientY,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingTable) {
      handleTableDragEnd();
    }
    setIsPanning(false);
    setIsDraggingTable(false);
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.001;
        setZoom((prev) => Math.min(Math.max(0.2, prev + delta), 3));
      } else {
        setPanOffset((prev) => ({
          x: prev.x + e.deltaX,
          y: prev.y + e.deltaY,
        }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  if (!weddingId) {
    return <Navigate to="/" replace />;
  }


  // Loading tables (only show when we have verified password)
  if (isAuthenticated && verifiedPassword && (tavoliLoading || invitatiLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento tavoli...</p>
        </div>
      </div>
    );
  }

  // Password protection screen - show when not authenticated OR when no verified password
  // This handles: first visit, session expired, and returning with localStorage session but no password
  if (!isAuthenticated || !verifiedPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configurazione Tavoli
            </h1>
            <p className="text-sm text-gray-600">
              {isAuthenticated && !verifiedPassword 
                ? 'Reinserisci la password per continuare la sessione'
                : 'Inserisci la password per accedere alla disposizione dei tavoli'
              }
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isVerifying}
                className="text-center text-lg"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? 'Verifica...' : 'Accedi'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Main view
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Disposizione Tavoli</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {weddingCoupleName || 'Matrimonio'} • {localTavoli.length} tavoli
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Reset
            </Button>

            {/* Table Rotation - Only when selected */}
            {selectedTableId && (
              <>
                <Separator orientation="vertical" className="h-8 mx-2" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Ruota:</span>
                  <Button variant="outline" size="sm" onClick={() => rotateTable(-15)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => rotateTable(15)}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            <Separator orientation="vertical" className="h-8 mx-2" />
            
            {/* Logout Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flex-1 overflow-hidden relative bg-gray-50 ${
          isDraggingTable ? 'cursor-grabbing' :
          isPanning ? 'cursor-grabbing' :
          'cursor-grab'
        }`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {localTavoli.length === 0 ? (
          // Empty state
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun tavolo configurato</h3>
              <p className="text-sm text-gray-500">
                I tavoli verranno visualizzati qui una volta configurati
              </p>
            </div>
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`${panOffset.x} ${panOffset.y} ${
              (canvasRef.current?.clientWidth || 800) / zoom
            } ${(canvasRef.current?.clientHeight || 600) / zoom}`}
            className="bg-white"
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1" />
              </pattern>
            </defs>

            <rect
              x={panOffset.x - 1000}
              y={panOffset.y - 1000}
              width={(canvasRef.current?.clientWidth || 800) / zoom + 2000}
              height={(canvasRef.current?.clientHeight || 600) / zoom + 2000}
              fill="url(#grid)"
            />

            {/* Tables - Use localTavoli for real-time updates */}
            {localTavoli.map((tavolo) => {
              console.log('🎨 Rendering table:', tavolo.id, tavolo.nome, tavolo.posizione_x, tavolo.posizione_y);
              
              return (
                <TavoloSVG
                  key={tavolo.id}
                  tavolo={tavolo}
                  assignments={getAssignmentsForTable(tavolo.id)}
                  onSeatClick={() => {}}
                  onAssignGuest={() => {}}
                  isSelected={selectedTableId === tavolo.id}
                  onTableClick={() => {
                    console.log('🎯 Table clicked:', tavolo.id);
                    setSelectedTableId(tavolo.id);
                  }}
                  onTableDragStart={(e) => handleTableDragStart(tavolo.id, e)}
                  onSeatMouseEnter={(guest, e) => {
                    setHoveredGuest(guest);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onSeatMouseLeave={() => setHoveredGuest(null)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Tooltip */}
      <GuestTooltip
        guest={hoveredGuest}
        position={tooltipPosition}
        visible={!!hoveredGuest}
      />
    </div>
  );
}
