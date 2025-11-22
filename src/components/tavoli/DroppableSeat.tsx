import React from "react";
import { cn } from "@/lib/utils";

interface DroppableSeatProps {
  tavoloId: string;
  seatIndex: number;
  position: { x: number; y: number; rotation: number };
  guest: any;
  borderColor: string;
  onSeatClick: () => void;
  onDrop: (guestId: string) => void;
}

const DroppableSeat = ({
  tavoloId,
  seatIndex,
  position,
  guest,
  borderColor,
  onSeatClick,
  onDrop,
}: DroppableSeatProps) => {
  const [isOver, setIsOver] = React.useState(false);
  const droppableId = `seat-${tavoloId}-${seatIndex}`;

  return (
    <g
      transform={`translate(${position.x}, ${position.y}) rotate(${position.rotation})`}
      style={{ pointerEvents: "all" } as any}
    >
      {/* Foreign object for React droppable */}
      <foreignObject x="-35" y="-25" width="70" height="50">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsOver(true);
            console.log("🎯 DRAG OVER:", droppableId);
          }}
          onDragLeave={() => {
            setIsOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const guestId = e.dataTransfer.getData("guestId");
            setIsOver(false);
            console.log("📍 DROP on:", droppableId, "guest:", guestId);
            if (guestId) {
              onDrop(guestId);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log("🪑 Seat clicked:", droppableId);
            onSeatClick();
          }}
          className={cn(
            "w-full h-full rounded-lg border-[3px] flex flex-col items-center justify-center cursor-pointer transition-all",
            isOver ? "bg-blue-200 border-blue-600 scale-110" : guest ? "bg-white" : "bg-gray-100",
            !guest && !isOver && "border-gray-400"
          )}
          style={{
            borderColor: guest ? borderColor : isOver ? "#2563EB" : "#9CA3AF",
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
            <span className="text-[10px] text-gray-400">
              {isOver ? "Rilascia" : "Libero"}
            </span>
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
