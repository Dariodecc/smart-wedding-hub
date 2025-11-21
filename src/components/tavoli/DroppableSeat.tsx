import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableSeatProps {
  tavoloId: string;
  seatIndex: number;
  position: { x: number; y: number; rotation: number };
  guest: any;
  borderColor: string;
  onSeatClick: () => void;
}

const DroppableSeat = ({
  tavoloId,
  seatIndex,
  position,
  guest,
  borderColor,
  onSeatClick,
}: DroppableSeatProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `seat-${tavoloId}-${seatIndex}`,
    data: { tavoloId, seatIndex },
  });

  return (
    <g
      transform={`translate(${position.x}, ${position.y}) rotate(${position.rotation})`}
      style={{ pointerEvents: "all" } as any}
    >
      {/* Foreign object for React droppable */}
      <foreignObject x="-35" y="-25" width="70" height="50">
        <div
          ref={setNodeRef}
          onClick={(e) => {
            e.stopPropagation();
            onSeatClick();
          }}
          className={cn(
            "w-full h-full rounded-lg border-[3px] flex flex-col items-center justify-center cursor-pointer transition-all",
            isOver ? "bg-blue-100 border-blue-500" : guest ? "bg-white" : "bg-gray-100",
            !guest && !isOver && "border-gray-400"
          )}
          style={{
            borderColor: guest && !isOver ? borderColor : undefined,
          }}
        >
          {guest ? (
            <>
              <span className="text-xs font-bold text-gray-900">
                {guest.nome[0]}
                {guest.cognome[0]}
              </span>
              <span className="text-[8px] text-gray-600 leading-tight text-center truncate max-w-full px-1">
                {guest.nome}
              </span>
              <span className="text-[8px] text-gray-600 leading-tight text-center truncate max-w-full px-1">
                {guest.cognome}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-gray-400">Libero</span>
          )}
        </div>
      </foreignObject>

      {/* Chair back visual indicator */}
      <rect
        x="-30"
        y="-28"
        width="60"
        height="6"
        rx="3"
        fill={borderColor}
        style={{ pointerEvents: "none" } as any}
      />
    </g>
  );
};

export default DroppableSeat;
