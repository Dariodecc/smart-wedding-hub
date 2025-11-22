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
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

const DroppableSeat = ({
  tavoloId,
  seatIndex,
  position,
  guest,
  borderColor,
  onSeatClick,
  onDrop,
  onMouseEnter,
  onMouseLeave,
}: DroppableSeatProps) => {
  const [isOver, setIsOver] = React.useState(false);

  return (
    <g
      transform={`translate(${position.x}, ${position.y}) rotate(${position.rotation})`}
      style={{ pointerEvents: "all" } as any}
    >
      {/* Foreign object for React droppable */}
      <foreignObject x="-40" y="-30" width="80" height="60">
        <div
          draggable={!!guest}
          onDragStart={(e) => {
            if (guest) {
              e.dataTransfer.setData("guestId", guest.id);
              e.dataTransfer.setData("fromSeat", `${tavoloId}-${seatIndex}`);
              e.dataTransfer.effectAllowed = "move";
              console.log("🚀 DRAG FROM SEAT:", guest.id);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsOver(true);
          }}
          onDragLeave={() => {
            setIsOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const guestId = e.dataTransfer.getData("guestId");
            setIsOver(false);
            console.log("📍 DROP on seat:", guestId);
            onDrop(guestId);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSeatClick();
          }}
          onMouseEnter={guest ? onMouseEnter : undefined}
          onMouseLeave={guest ? onMouseLeave : undefined}
          className={cn(
            "w-full h-full rounded-lg border-[3px] flex flex-col items-center justify-center transition-all p-1",
            guest ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
            isOver ? "bg-blue-200 border-blue-600 scale-110" : guest ? "bg-white hover:shadow-lg" : "bg-gray-100",
            !guest && !isOver && "border-gray-400"
          )}
          style={{
            borderColor: guest ? borderColor : isOver ? "#2563EB" : "#9CA3AF"
          }}
        >
          {guest ? (
            <>
              <span className="text-xs font-bold text-gray-900">
                {guest.nome[0]}
                {guest.cognome[0]}
              </span>
              <span className="text-[8px] text-gray-600 leading-tight text-center">
                {guest.nome}
              </span>
              <span className="text-[8px] text-gray-600 leading-tight text-center">
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
    </g>
  );
};

export default DroppableSeat;
