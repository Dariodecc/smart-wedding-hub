import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, DragOverEvent, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Search, Users, User, Crown, Plus, ZoomIn, ZoomOut, Maximize2, CheckCircle, Loader2, Circle, RectangleHorizontal, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import DraggableGuest from "@/components/tavoli/DraggableGuest";
import TavoloSVG from "@/components/tavoli/TavoloSVG";

interface Tavolo {
  id: string;
  nome: string;
  tipo: "rotondo" | "rettangolare_singolo" | "rettangolare_doppio";
  capienza: number;
  posizione_x: number;
  posizione_y: number;
  rotazione: number;
}

interface Guest {
  id: string;
  nome: string;
  cognome: string;
  tipo_ospite: string;
  rsvp_status: string;
  is_capo_famiglia: boolean;
  famiglia_id: string | null;
  tavolo_id: string | null;
  posto_numero: number | null;
}

const Tavoli = () => {
  const { wedding } = useCurrentMatrimonio();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [tableDragStart, setTableDragStart] = useState({ x: 0, y: 0, tableX: 0, tableY: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  console.log('🎮 DndContext sensors initialized:', sensors);

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      nome: "",
      tipo: "rotondo" as "rotondo" | "rettangolare_singolo" | "rettangolare_doppio",
      capienza: 6,
    },
  });

  const watchTipo = watch("tipo");

  // Check if DnD Kit is properly installed
  useEffect(() => {
    console.log('🔍 Checking DnD Kit installation...');
    console.log('DndContext:', DndContext);
    console.log('Sensors:', sensors);
    
    if (!DndContext) {
      console.error('❌ DnD Kit not properly imported!');
    } else {
      console.log('✅ DnD Kit properly loaded');
    }
  }, []);

  // Fetch tavoli
  const { data: tavoli = [], isLoading: isLoadingTavoli } = useQuery({
    queryKey: ["tavoli", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("tavoli")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Tavolo[];
    },
    enabled: !!wedding?.id,
  });

  // Fetch invitati
  const { data: invitati = [], isLoading: isLoadingInvitati } = useQuery({
    queryKey: ["invitati", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("invitati")
        .select("id, nome, cognome, tipo_ospite, rsvp_status, is_capo_famiglia, famiglia_id, tavolo_id, posto_numero")
        .eq("wedding_id", wedding.id);
      if (error) throw error;
      return data as Guest[];
    },
    enabled: !!wedding?.id,
  });

  // Fetch famiglie
  const { data: famiglie = [] } = useQuery({
    queryKey: ["famiglie", wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return [];
      const { data, error } = await supabase
        .from("famiglie")
        .select("id, nome")
        .eq("wedding_id", wedding.id);
      if (error) throw error;
      return data;
    },
    enabled: !!wedding?.id,
  });

  // Available guests (not assigned to any table)
  const availableGuests = useMemo(() => {
    return invitati.filter((g) => !g.tavolo_id);
  }, [invitati]);

  // Filtered available guests
  const filteredAvailableGuests = useMemo(() => {
    if (!searchQuery) return availableGuests;
    const query = searchQuery.toLowerCase();
    return availableGuests.filter(
      (g) =>
        g.nome.toLowerCase().includes(query) ||
        g.cognome.toLowerCase().includes(query)
    );
  }, [availableGuests, searchQuery]);

  // Group guests by family
  const groupedGuests = useMemo(() => {
    const groups: Array<{
      type: "family" | "singles";
      famiglia?: { id: string; nome: string };
      membri?: Guest[];
      singles?: Guest[];
    }> = [];

    const familyMap = new Map<string, Guest[]>();
    const singles: Guest[] = [];

    filteredAvailableGuests.forEach((guest) => {
      if (guest.famiglia_id) {
        if (!familyMap.has(guest.famiglia_id)) {
          familyMap.set(guest.famiglia_id, []);
        }
        familyMap.get(guest.famiglia_id)!.push(guest);
      } else {
        singles.push(guest);
      }
    });

    // Add family groups
    familyMap.forEach((membri, famigliaId) => {
      const famiglia = famiglie.find((f) => f.id === famigliaId);
      if (famiglia) {
        // Sort: capo famiglia first
        const sorted = [...membri].sort((a, b) => {
          if (a.is_capo_famiglia && !b.is_capo_famiglia) return -1;
          if (!a.is_capo_famiglia && b.is_capo_famiglia) return 1;
          return 0;
        });
        groups.push({
          type: "family",
          famiglia,
          membri: sorted,
        });
      }
    });

    // Add singles group
    if (singles.length > 0) {
      groups.push({
        type: "singles",
        singles,
      });
    }

    return groups;
  }, [filteredAvailableGuests, famiglie]);

  // Total assigned guests
  const totalAssigned = useMemo(() => {
    return invitati.filter((g) => g.tavolo_id).length;
  }, [invitati]);

  // Get assignments for a table
  const getAssignmentsForTable = (tavoloId: string) => {
    const assignments: Record<number, { guest: Guest }> = {};
    invitati
      .filter((g) => g.tavolo_id === tavoloId && g.posto_numero !== null)
      .forEach((guest) => {
        assignments[guest.posto_numero!] = { guest };
      });
    return assignments;
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Add table mutation
  const addTableMutation = useMutation({
    mutationFn: async (data: {
      nome: string;
      tipo: string;
      capienza: number;
    }) => {
      if (!wedding?.id) throw new Error("No wedding selected");

      // Calculate position for new table (stagger them)
      const offset = tavoli.length * 300;
      const x = 200 + (offset % 1200);
      const y = 200 + Math.floor(offset / 1200) * 300;

      const { error } = await supabase.from("tavoli").insert({
        wedding_id: wedding.id,
        nome: data.nome,
        tipo: data.tipo,
        capienza: data.capienza,
        posizione_x: x,
        posizione_y: y,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tavoli", wedding?.id] });
      setShowAddTableDialog(false);
      reset();
      toast.success("Tavolo creato con successo");
    },
    onError: (error) => {
      console.error("Error adding table:", error);
      toast.error("Errore nella creazione del tavolo");
    },
  });

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🏁 DRAG END:', {
      activeId: event.active.id,
      overId: event.over?.id,
      overData: event.over?.data.current
    });

    const { active, over } = event;
    setActiveGuest(null);

    if (!over) {
      console.warn('⚠️ No drop target');
      return;
    }

    const guestId = active.id as string;
    const dropData = over.data.current;

    console.log('📍 Drop data:', dropData);

    if (!dropData?.tavoloId || dropData?.seatIndex === undefined) {
      console.error('❌ Invalid drop data:', dropData);
      return;
    }

    const { tavoloId, seatIndex } = dropData;

    console.log('✨ Assigning guest:', {
      guestId,
      guestName: activeGuest ? `${activeGuest.nome} ${activeGuest.cognome}` : 'unknown',
      tavoloId,
      seatIndex
    });

    try {
      // Check if seat is already occupied
      console.log('🔍 Checking if seat is occupied...');

      const { data: existingAssignment, error: checkError } = await supabase
        .from("invitati")
        .select("id, nome, cognome")
        .eq("tavolo_id", tavoloId)
        .eq("posto_numero", seatIndex)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking seat:', checkError);
        throw checkError;
      }

      if (existingAssignment) {
        console.warn('⚠️ Seat already occupied by:', existingAssignment);
        toast.error(`Questo posto è già occupato da ${existingAssignment.nome} ${existingAssignment.cognome}`);
        return;
      }

      console.log('✅ Seat is free, assigning...');

      // Assign guest to table and seat
      const { error: updateError } = await supabase
        .from("invitati")
        .update({
          tavolo_id: tavoloId,
          posto_numero: seatIndex,
        })
        .eq("id", guestId);

      if (updateError) {
        console.error('❌ Error updating guest:', updateError);
        throw updateError;
      }

      console.log('✅ Guest assigned successfully!');

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ["invitati", wedding?.id] });
      toast.success("Ospite assegnato al tavolo");
    } catch (error) {
      console.error('💥 Error in handleDragEnd:', error);
      toast.error("Errore nell'assegnare l'ospite");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log('🚀 DRAG START:', {
      activeId: event.active.id,
      activeData: event.active.data.current,
      guest: event.active.data.current?.guest
    });

    const { active } = event;
    const guest = active.data.current?.guest;
    setActiveGuest(guest);

    if (!guest) {
      console.error('❌ No guest data in drag start!');
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    console.log('🎯 DRAG OVER:', {
      activeId: event.active.id,
      overId: event.over?.id
    });
  };

  const handleDragCancel = () => {
    console.log('🚫 DRAG CANCELLED');
    setActiveGuest(null);
  };

  // Handle seat click (to remove assignment)
  const handleSeatClick = async (tavoloId: string, seatIndex: number) => {
    const assignment = getAssignmentsForTable(tavoloId)[seatIndex];
    if (!assignment) return;

    try {
      const { error } = await supabase
        .from("invitati")
        .update({
          tavolo_id: null,
          posto_numero: null,
        })
        .eq("id", assignment.guest.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["invitati", wedding?.id] });
      toast.success("Ospite rimosso dal tavolo");
    } catch (error) {
      console.error("Error removing guest:", error);
      toast.error("Errore nella rimozione dell'ospite");
    }
  };

  // Table interaction handlers
  const handleTableClick = (tavoloId: string) => {
    console.log('🎯 Table clicked:', {
      tavoloId,
      previousSelected: selectedTableId,
      tavolo: tavoli.find(t => t.id === tavoloId)
    });
    setSelectedTableId(tavoloId);
  };

  const handleTableDragStart = (tavoloId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🚀 Table drag start:', tavoloId);

    const tavolo = tavoli.find((t) => t.id === tavoloId);
    if (!tavolo) {
      console.error('❌ Table not found for drag:', tavoloId);
      return;
    }

    console.log('📍 Table initial position:', {
      x: tavolo.posizione_x,
      y: tavolo.posizione_y
    });

    setSelectedTableId(tavoloId);
    setIsDraggingTable(true);

    // Get SVG coordinates
    const svg = (e.target as SVGElement).ownerSVGElement;
    if (!svg) {
      console.error('❌ No SVG element found');
      return;
    }

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    console.log('🖱️ Mouse SVG coordinates:', { x: svgP.x, y: svgP.y });

    setTableDragStart({
      x: svgP.x,
      y: svgP.y,
      tableX: tavolo.posizione_x,
      tableY: tavolo.posizione_y,
    });

    console.log('✅ Table drag initialized');
  };

  const handleTableDragMove = (e: React.MouseEvent) => {
    if (!isDraggingTable || !selectedTableId) return;

    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const deltaX = svgP.x - tableDragStart.x;
    const deltaY = svgP.y - tableDragStart.y;

    // Update position optimistically in query cache
    queryClient.setQueryData(["tavoli", wedding?.id], (old: Tavolo[] | undefined) => {
      if (!old) return old;
      return old.map((t) =>
        t.id === selectedTableId
          ? {
              ...t,
              posizione_x: tableDragStart.tableX + deltaX,
              posizione_y: tableDragStart.tableY + deltaY,
            }
          : t
      );
    });
  };

  const handleTableDragEnd = async () => {
    if (!isDraggingTable || !selectedTableId) return;

    setIsDraggingTable(false);

    const tavolo = tavoli.find((t) => t.id === selectedTableId);
    if (!tavolo) return;

    // Save to database
    try {
      const { error } = await supabase
        .from("tavoli")
        .update({
          posizione_x: tavolo.posizione_x,
          posizione_y: tavolo.posizione_y,
        })
        .eq("id", selectedTableId);

      if (error) throw error;

      toast.success("Posizione tavolo salvata");
    } catch (error) {
      console.error("Error saving table position:", error);
      toast.error("Errore nel salvare la posizione");
      // Revert on error
      await queryClient.invalidateQueries({ queryKey: ["tavoli", wedding?.id] });
    }
  };

  const rotateTable = async (degrees: number) => {
    console.log('🔄 Rotating table:', {
      selectedTableId,
      degrees,
      currentRotation: tavoli.find(t => t.id === selectedTableId)?.rotazione || 0
    });

    if (!selectedTableId) {
      console.error('❌ No table selected for rotation');
      return;
    }

    const tavolo = tavoli.find((t) => t.id === selectedTableId);
    if (!tavolo) {
      console.error('❌ Table not found:', selectedTableId);
      return;
    }

    const currentRotation = tavolo.rotazione || 0;
    const newRotation = currentRotation + degrees;

    console.log('🔄 Rotation update:', {
      current: currentRotation,
      delta: degrees,
      new: newRotation
    });

    // Update locally
    console.log('✅ Updating local state...');
    queryClient.setQueryData(["tavoli", wedding?.id], (old: Tavolo[] | undefined) => {
      if (!old) return old;
      const updated = old.map((t) => (t.id === selectedTableId ? { ...t, rotazione: newRotation } : t));
      console.log('✅ Local tavoli state updated:', updated.find(t => t.id === selectedTableId));
      return updated;
    });

    // Save to database
    try {
      console.log('💾 Saving rotation to database...');

      const { error } = await supabase
        .from("tavoli")
        .update({ rotazione: newRotation })
        .eq("id", selectedTableId);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Rotation saved to database');
      toast.success(`Tavolo ruotato di ${degrees}°`);
    } catch (error) {
      console.error('💥 Error rotating table:', error);
      toast.error("Errore nella rotazione");
      await queryClient.invalidateQueries({ queryKey: ["tavoli", wedding?.id] });
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTableId) return;

    const tavolo = tavoli.find((t) => t.id === selectedTableId);
    if (!tavolo) return;

    if (!confirm(`Eliminare il tavolo "${tavolo.nome}"? Gli ospiti assegnati torneranno disponibili.`)) {
      return;
    }

    try {
      // Unassign all guests from this table
      await supabase
        .from("invitati")
        .update({ tavolo_id: null, posto_numero: null })
        .eq("tavolo_id", selectedTableId);

      // Delete table
      const { error } = await supabase.from("tavoli").delete().eq("id", selectedTableId);

      if (error) throw error;

      setSelectedTableId(null);

      await queryClient.invalidateQueries({ queryKey: ["tavoli", wedding?.id] });
      await queryClient.invalidateQueries({ queryKey: ["invitati", wedding?.id] });

      toast.success("Tavolo eliminato");
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Errore nell'eliminare il tavolo");
    }
  };

  // Canvas mouse handlers
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingTable) {
      handleTableDragMove(e);
    } else if (isPanning) {
      handleMouseMove(e);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingTable) {
      handleTableDragEnd();
    } else {
      handleMouseUp();
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Deselect table if clicking on canvas background
    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).tagName === "rect") {
      setSelectedTableId(null);
    }
    handleMouseDown(e);
  };

  if (!wedding) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    );
  }

  const isLoading = isLoadingTavoli || isLoadingInvitati;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter}
    >
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Left Sidebar - Guests List */}
        <div className="w-[400px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Ospiti Disponibili</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {availableGuests.length} ospiti senza tavolo
            </p>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca ospite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* Guests List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : groupedGuests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Tutti gli ospiti sono assegnati!
                </h3>
                <p className="text-sm text-gray-500">
                  Ottimo lavoro! Ogni ospite ha il suo posto.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedGuests.map((group, idx) => (
                  <div key={group.type === "family" ? group.famiglia!.id : `singles-${idx}`}>
                    {/* Group Header */}
                    {group.type === "family" && (
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">
                          {group.famiglia!.nome}
                        </span>
                        <span className="text-xs text-purple-600">
                          ({group.membri!.length})
                        </span>
                      </div>
                    )}

                    {group.type === "singles" && (
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          Invitati Singoli
                        </span>
                      </div>
                    )}

                    {/* Guest Cards */}
                    <div className="space-y-2">
                      {(group.type === "family" ? group.membri! : group.singles!).map((guest) => (
                        <DraggableGuest key={guest.id} guest={guest} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Disposizione Tavoli</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {tavoli.length} tavoli • {totalAssigned} ospiti assegnati
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="border-gray-200"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="border-gray-200"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoom(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="border-gray-200 ml-2"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Reset
                </Button>

                <Separator orientation="vertical" className="h-8 mx-2" />

                {/* Rotation & Delete Controls - Only shown when table selected */}
                {selectedTableId && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Ruota:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rotateTable(-15)}
                        className="border-gray-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rotateTable(15)}
                        className="border-gray-200"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteTable}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-8 mx-2" />
                  </>
                )}

                {/* Add Table Button */}
                <Button
                  onClick={() => setShowAddTableDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Tavolo
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className={cn(
              "flex-1 overflow-hidden relative",
              isDraggingTable ? "cursor-grabbing" : isPanning ? "cursor-grabbing" : "cursor-move"
            )}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
            ) : tavoli.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Circle className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun tavolo ancora
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Inizia creando il tuo primo tavolo
                </p>
                <Button
                  onClick={() => setShowAddTableDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Primo Tavolo
                </Button>
              </div>
            ) : (
              <svg
                width="100%"
                height="100%"
                viewBox={`${-panOffset.x} ${-panOffset.y} ${
                  (canvasRef.current?.clientWidth || 1000) / zoom
                } ${(canvasRef.current?.clientHeight || 800) / zoom}`}
                className="bg-white"
              >
                {/* Grid Pattern */}
                <defs>
                  <pattern
                    id="grid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#f0f0f0"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Tables */}
                {tavoli.map((tavolo) => (
                  <TavoloSVG
                    key={tavolo.id}
                    tavolo={tavolo}
                    assignments={getAssignmentsForTable(tavolo.id)}
                    onSeatClick={handleSeatClick}
                    isSelected={selectedTableId === tavolo.id}
                    onTableClick={() => handleTableClick(tavolo.id)}
                    onTableDragStart={(e) => handleTableDragStart(tavolo.id, e)}
                  />
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* DragOverlay - MUST be inside DndContext */}
      <DragOverlay>
        {activeGuest && (
          <div className="p-3 bg-white rounded-lg border-2 border-blue-500 shadow-xl">
            <p className="text-sm font-medium">
              {activeGuest.nome} {activeGuest.cognome}
            </p>
          </div>
        )}
      </DragOverlay>

      {/* Add Table Dialog */}
      <Dialog open={showAddTableDialog} onOpenChange={setShowAddTableDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aggiungi Nuovo Tavolo</DialogTitle>
            <DialogDescription>
              Crea un nuovo tavolo per la disposizione degli ospiti
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => addTableMutation.mutate(data))}>
            <div className="space-y-4">
              {/* Table Name */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Tavolo *</Label>
                <Input
                  id="nome"
                  {...register("nome", { required: true })}
                  placeholder="es. Tavolo 1, Sposi, Testimoni..."
                />
              </div>

              {/* Table Type */}
              <div className="space-y-2">
                <Label>Tipo Tavolo *</Label>
                <RadioGroup
                  value={watchTipo}
                  onValueChange={(value) =>
                    setValue("tipo", value as any)
                  }
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="rotondo" id="rotondo" />
                    <Label
                      htmlFor="rotondo"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Circle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Tavolo Rotondo</p>
                          <p className="text-xs text-gray-500">
                            Massimo 10 persone
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem
                      value="rettangolare_singolo"
                      id="rett-singolo"
                    />
                    <Label
                      htmlFor="rett-singolo"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <RectangleHorizontal className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Rettangolare Singolo</p>
                          <p className="text-xs text-gray-500">
                            Sedie su un solo lato
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem
                      value="rettangolare_doppio"
                      id="rett-doppio"
                    />
                    <Label
                      htmlFor="rett-doppio"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <RectangleHorizontal className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Rettangolare Doppio</p>
                          <p className="text-xs text-gray-500">
                            Sedie su entrambi i lati
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capienza">Capienza *</Label>
                <Input
                  id="capienza"
                  type="number"
                  min="1"
                  max={watchTipo === "rotondo" ? 10 : 20}
                  {...register("capienza", {
                    required: true,
                    min: 1,
                    max: watchTipo === "rotondo" ? 10 : 20,
                  })}
                />
                <p className="text-xs text-gray-500">
                  {watchTipo === "rotondo"
                    ? "Massimo 10 per tavolo rotondo"
                    : "Massimo 20 persone"}
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTableDialog(false)}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={addTableMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addTableMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Aggiungi Tavolo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default Tavoli;
