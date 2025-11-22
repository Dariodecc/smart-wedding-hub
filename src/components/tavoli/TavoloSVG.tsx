import { useMemo } from "react";
import DroppableSeat from "./DroppableSeat";

interface TavoloSVGProps {
  tavolo: {
    id: string;
    nome: string;
    tipo: "rotondo" | "rettangolare_singolo" | "rettangolare_doppio";
    capienza: number;
    posizione_x: number;
    posizione_y: number;
    rotazione?: number;
  };
  assignments: Record<number, { guest: any }>;
  onSeatClick: (seatIndex: number) => void;
  onAssignGuest: (guestId: string, tavoloId: string, seatIndex: number) => void;
  isSelected: boolean;
  onTableClick: () => void;
  onTableDragStart: (e: React.MouseEvent) => void;
}

// Calculate seats in circle (for round table)
const calculateCircleSeats = (count: number, radius: number) => {
  const seats = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    seats.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: (angle * 180) / Math.PI + 90, // Face center
    });
  }

  return seats;
};

// Calculate seats on one side (for single-side rectangular)
const calculateSingleSideSeats = (count: number, width: number) => {
  const seats = [];
  const spacing = width / (count + 1);

  for (let i = 0; i < count; i++) {
    seats.push({
      x: -width / 2 + spacing * (i + 1),
      y: 80, // Distance from table
      rotation: 0, // All facing up
    });
  }

  return seats;
};

// Calculate seats on both sides (for double-side rectangular)
const calculateDoubleSideSeats = (count: number, width: number, height: number) => {
  const seats = [];
  const seatsPerSide = Math.ceil(count / 2);
  const spacingTop = width / (Math.ceil(count / 2) + 1);
  const spacingBottom = width / (Math.floor(count / 2) + 1);

  // Top side
  for (let i = 0; i < Math.ceil(count / 2); i++) {
    seats.push({
      x: -width / 2 + spacingTop * (i + 1),
      y: -height / 2 - 40,
      rotation: 180, // Face down
    });
  }

  // Bottom side
  for (let i = 0; i < Math.floor(count / 2); i++) {
    seats.push({
      x: -width / 2 + spacingBottom * (i + 1),
      y: height / 2 + 40,
      rotation: 0, // Face up
    });
  }

  return seats;
};

const TavoloSVG = ({
  tavolo,
  assignments,
  onSeatClick,
  onAssignGuest,
  isSelected,
  onTableClick,
  onTableDragStart,
}: TavoloSVGProps) => {
  const { tipo, capienza, posizione_x, posizione_y, nome, id, rotazione } = tavolo;

  // Calculate seat positions based on table type
  const seatPositions = useMemo(() => {
    switch (tipo) {
      case "rotondo":
        return calculateCircleSeats(capienza, 120); // radius
      case "rettangolare_singolo":
        return calculateSingleSideSeats(capienza, 400); // width
      case "rettangolare_doppio":
        return calculateDoubleSideSeats(capienza, 400, 100); // width, height
      default:
        return [];
    }
  }, [tipo, capienza]);

  return (
    <g transform={`translate(${posizione_x}, ${posizione_y}) rotate(${rotazione || 0})`}>
      {/* Selection Highlight */}
      {isSelected && (
        <>
          {tipo === "rotondo" && (
            <circle
              cx="0"
              cy="0"
              r="110"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="10 5"
              opacity="0.8"
            />
          )}
          {(tipo === "rettangolare_singolo" || tipo === "rettangolare_doppio") && (
            <rect
              x={tipo === "rettangolare_singolo" ? -210 : -210}
              y={tipo === "rettangolare_singolo" ? -50 : -60}
              width={tipo === "rettangolare_singolo" ? 420 : 420}
              height={tipo === "rettangolare_singolo" ? 90 : 110}
              rx="15"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="10 5"
              opacity="0.8"
            />
          )}
        </>
      )}

      {/* Table Shape */}
      {tipo === "rotondo" && (
        <circle
          cx="0"
          cy="0"
          r="100"
          fill="#f9fafb"
          stroke={isSelected ? "#3B82F6" : "#d1d5db"}
          strokeWidth={isSelected ? "4" : "3"}
          className="cursor-move"
          onClick={(e) => {
            e.stopPropagation();
            onTableClick();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onTableDragStart(e);
          }}
          style={{ pointerEvents: "all" } as any}
        />
      )}

      {tipo === "rettangolare_singolo" && (
        <rect
          x="-200"
          y="-40"
          width="400"
          height="80"
          rx="10"
          fill="#f9fafb"
          stroke={isSelected ? "#3B82F6" : "#d1d5db"}
          strokeWidth={isSelected ? "4" : "3"}
          className="cursor-move"
          onClick={(e) => {
            e.stopPropagation();
            onTableClick();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onTableDragStart(e);
          }}
          style={{ pointerEvents: "all" } as any}
        />
      )}

      {tipo === "rettangolare_doppio" && (
        <rect
          x="-200"
          y="-50"
          width="400"
          height="100"
          rx="10"
          fill="#f9fafb"
          stroke={isSelected ? "#3B82F6" : "#d1d5db"}
          strokeWidth={isSelected ? "4" : "3"}
          className="cursor-move"
          onClick={(e) => {
            e.stopPropagation();
            onTableClick();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onTableDragStart(e);
          }}
          style={{ pointerEvents: "all" } as any}
        />
      )}

      {/* Table Number */}
      <text
        x="0"
        y="5"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="#374151"
        style={{ pointerEvents: "none", userSelect: "none" } as any}
      >
        {nome}
      </text>

      {/* Seats */}
      {seatPositions.map((pos, index) => {
        const assignment = assignments[index];
        const guest = assignment?.guest;

        const borderColor = guest
          ? guest.rsvp_status === "Ci sarò"
            ? "#10B981"
            : guest.rsvp_status === "In attesa"
            ? "#F59E0B"
            : "#EF4444"
          : "#9CA3AF";

        return (
          <DroppableSeat
            key={index}
            tavoloId={id}
            seatIndex={index}
            position={pos}
            guest={guest}
            borderColor={borderColor}
            onSeatClick={() => onSeatClick(index)}
            onDrop={(guestId) => onAssignGuest(guestId, id, index)}
          />
        );
      })}
    </g>
  );
};

export default TavoloSVG;
