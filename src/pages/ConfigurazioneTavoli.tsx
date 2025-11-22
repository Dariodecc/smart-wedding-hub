import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, RotateCw } from 'lucide-react';
import TavoloSVG from '@/components/tavoli/TavoloSVG';
import { GuestTooltip } from '@/components/tavoli/GuestTooltip';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredGuest, setHoveredGuest] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isInitialViewSet, setIsInitialViewSet] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch wedding settings
  const { data: wedding, isLoading: weddingLoading } = useQuery({
    queryKey: ['wedding-public', weddingId],
    queryFn: async () => {
      console.log('🔍 Fetching wedding:', weddingId);
      
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      if (error) {
        console.error('❌ Error fetching wedding:', error);
        throw error;
      }
      
      console.log('✅ Wedding data loaded:', {
        id: data.id,
        couple_name: data.couple_name,
        password_set: !!data.password,
        password_value: data.password ? `"${data.password}"` : 'null'
      });
      
      return data;
    },
    enabled: !!weddingId,
  });

  // Check password
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const correctPassword = wedding?.password;
    
    console.log('🔐 Password check:', {
      entered: `"${password}"`,
      correct: correctPassword ? `"${correctPassword}"` : 'null',
      enteredLength: password.length,
      correctLength: correctPassword?.length || 0,
      passwordSet: !!correctPassword
    });

    if (!correctPassword) {
      toast.error('Nessuna password configurata per questo matrimonio');
      console.warn('⚠️ No password set for this wedding');
      return;
    }

    // Trim both passwords to avoid whitespace issues
    if (password.trim() === correctPassword.trim()) {
      setIsAuthenticated(true);
      toast.success('Accesso consentito');
      console.log('✅ Password correct - authenticated');
    } else {
      toast.error('Password errata');
      console.error('❌ Password mismatch:', { 
        entered: `"${password.trim()}"`, 
        correct: `"${correctPassword.trim()}"`,
        match: password.trim() === correctPassword.trim()
      });
    }
  };

  // Fetch tables
  const { data: tavoli = [] } = useQuery({
    queryKey: ['tavoli-public', weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tavoli')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at');

      if (error) throw error;
      return data as Tavolo[];
    },
    enabled: isAuthenticated && !!weddingId,
  });

  // Fetch guests with assignments
  const { data: invitati = [] } = useQuery({
    queryKey: ['invitati-public', weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitati')
        .select(`
          id,
          nome,
          cognome,
          tipo_ospite,
          rsvp_status,
          is_capo_famiglia,
          famiglia_id,
          tavolo_id,
          posto_numero,
          preferenze_alimentari,
          famiglie:famiglia_id(id, nome),
          gruppi:gruppo_id(id, nome, colore)
        `)
        .eq('wedding_id', weddingId);

      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated && !!weddingId,
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

  // Auto-center view on load
  useEffect(() => {
    if (tavoli.length > 0 && !isInitialViewSet && canvasRef.current) {
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;

      tavoli.forEach((tavolo) => {
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
  }, [tavoli, isInitialViewSet]);

  // Rotation handler
  const rotateTable = async (degrees: number) => {
    if (!selectedTableId) return;

    const tavolo = tavoli.find((t) => t.id === selectedTableId);
    if (!tavolo) return;

    const newRotation = (tavolo.rotazione || 0) + degrees;

    // Update locally
    queryClient.setQueryData(['tavoli-public', weddingId], (old: Tavolo[] | undefined) => {
      if (!old) return old;
      return old.map((t) =>
        t.id === selectedTableId ? { ...t, rotazione: newRotation } : t
      );
    });

    try {
      const { error } = await supabase
        .from('tavoli')
        .update({ rotazione: newRotation })
        .eq('id', selectedTableId);

      if (error) throw error;
      toast.success(`Tavolo ruotato di ${degrees}°`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Errore nella rotazione');
      await queryClient.invalidateQueries({ queryKey: ['tavoli-public', weddingId] });
    }
  };

  // Reset view
  const handleResetView = () => {
    if (tavoli.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    tavoli.forEach((tavolo) => {
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
    if (isPanning) {
      setPanOffset({
        x: panStart.x - e.clientX,
        y: panStart.y - e.clientY,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
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

  // Loading state
  if (weddingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Password protection screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          {/* Debug info - visible only in development */}
          {import.meta.env.DEV && wedding && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono">
              <p className="font-bold mb-1">🔍 Debug Info:</p>
              <p>Wedding ID: {weddingId}</p>
              <p>Password set: {wedding.password ? 'Yes' : 'No'}</p>
              <p>Password value: {wedding.password ? `"${wedding.password}"` : 'null'}</p>
              <p>Password length: {wedding.password?.length || 0}</p>
            </div>
          )}
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configurazione Tavoli
            </h1>
            <p className="text-sm text-gray-600">
              Inserisci la password per accedere alla disposizione dei tavoli
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
                className="text-center text-lg"
              />
            </div>

            <Button type="submit" className="w-full">
              Accedi
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
              {wedding?.couple_name || 'Matrimonio'} • {tavoli.length} tavoli
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
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative bg-gray-50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
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

          {/* Tables */}
          {tavoli.map((tavolo) => (
            <TavoloSVG
              key={tavolo.id}
              tavolo={tavolo}
              assignments={getAssignmentsForTable(tavolo.id)}
              onSeatClick={() => {}}
              onAssignGuest={() => {}}
              isSelected={selectedTableId === tavolo.id}
              onTableClick={() => setSelectedTableId(tavolo.id)}
              onTableDragStart={() => {}}
              onSeatMouseEnter={(guest, e) => {
                setHoveredGuest(guest);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onSeatMouseLeave={() => setHoveredGuest(null)}
            />
          ))}
        </svg>
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
