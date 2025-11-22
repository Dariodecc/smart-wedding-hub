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
  onSeatMouseEnter?: (guest: any, e: React.MouseEvent) => void;
  onSeatMouseLeave?: () => void;
}

// Helper to calculate table length based on seats
const getTableLength = (capienza: number): number => {
  const baseLength = 200
  const lengthPerSeat = 80
  return baseLength + (capienza * lengthPerSeat / 2)
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
      rotation: 0, // Always upright
    });
  }

  return seats;
};

// Calculate seat positions for single-side rectangular table
const calculateSingleSideSeats = (
  count: number,
  tableLength: number
): Array<{ x: number; y: number; rotation: number }> => {
  const positions = []
  const spacing = tableLength / (count + 1)
  const startX = -tableLength / 2

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + spacing * (i + 1),
      y: -70,
      rotation: 0 // Always upright
    })
  }

  return positions
}

// Calculate seat positions on both sides (for double-side rectangular)
const calculateDoubleSideSeats = (
  count: number,
  tableLength: number,
  tableWidth: number
): Array<{ x: number; y: number; rotation: number }> => {
  const positions = []
  const seatsPerSide = Math.ceil(count / 2)
  const spacing = tableLength / (seatsPerSide + 1)
  const startX = -tableLength / 2

  // Top side
  for (let i = 0; i < Math.floor(count / 2); i++) {
    positions.push({
      x: startX + spacing * (i + 1),
      y: -80,
      rotation: 0 // Always upright
    })
  }

  // Bottom side
  for (let i = 0; i < Math.ceil(count / 2); i++) {
    positions.push({
      x: startX + spacing * (i + 1),
      y: 80,
      rotation: 0 // Always upright
    })
  }

  return positions
}

const TavoloSVG = ({
  tavolo,
  assignments,
  onSeatClick,
  onAssignGuest,
  isSelected,
  onTableClick,
  onTableDragStart,
  onSeatMouseEnter,
  onSeatMouseLeave,
}: TavoloSVGProps) => {
  const { tipo, capienza, posizione_x, posizione_y, nome, id, rotazione } = tavolo;

  // Calculate seat positions based on table type
  const seatPositions = useMemo(() => {
    const tableLength = getTableLength(capienza)
    if (tipo === 'rotondo') {
      return calculateCircleSeats(capienza, 120)
    } else if (tipo === 'rettangolare_singolo') {
      return calculateSingleSideSeats(capienza, tableLength)
    } else if (tipo === 'rettangolare_doppio') {
      return calculateDoubleSideSeats(capienza, tableLength, 100)
    }
    return []
  }, [tipo, capienza]);

  const tableLength = getTableLength(capienza)
  
  return (
    <g transform={`translate(${posizione_x}, ${posizione_y})`}>
      {/* Selection Highlight - Rotates with table */}
      {isSelected && (
        <g transform={`rotate(${rotazione || 0})`}>
          {tipo === 'rotondo' && (
            <circle
              cx="0"
              cy="0"
              r="130"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="10 5"
              opacity="0.8"
            />
          )}
          {tipo === 'rettangolare_singolo' && (
            <rect
              x={-tableLength/2 - 20}
              y="-60"
              width={tableLength + 40}
              height="120"
              rx="15"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="10 5"
              opacity="0.8"
            />
          )}
          {tipo === 'rettangolare_doppio' && (
            <rect
              x={-tableLength/2 - 20}
              y="-70"
              width={tableLength + 40}
              height="140"
              rx="15"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeDasharray="10 5"
              opacity="0.8"
            />
          )}
        </g>
      )}

      {/* Table Shape - Rotates */}
      <g transform={`rotate(${rotazione || 0})`}>
        {tipo === 'rotondo' && (
          <circle
            cx="0"
            cy="0"
            r="100"
            fill="#f9fafb"
            stroke={isSelected ? "#3B82F6" : "#d1d5db"}
            strokeWidth={isSelected ? "4" : "3"}
            className="cursor-move"
            onClick={(e) => {
              e.stopPropagation()
              onTableClick()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              onTableDragStart(e)
            }}
            style={{ pointerEvents: 'all' } as any}
          />
        )}

        {tipo === 'rettangolare_singolo' && (
          <rect
            x={-tableLength/2}
            y="-40"
            width={tableLength}
            height="80"
            rx="10"
            fill="#f9fafb"
            stroke={isSelected ? "#3B82F6" : "#d1d5db"}
            strokeWidth={isSelected ? "4" : "3"}
            className="cursor-move"
            onClick={(e) => {
              e.stopPropagation()
              onTableClick()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              onTableDragStart(e)
            }}
            style={{ pointerEvents: 'all' } as any}
          />
        )}

        {tipo === 'rettangolare_doppio' && (
          <rect
            x={-tableLength/2}
            y="-50"
            width={tableLength}
            height="100"
            rx="10"
            fill="#f9fafb"
            stroke={isSelected ? "#3B82F6" : "#d1d5db"}
            strokeWidth={isSelected ? "4" : "3"}
            className="cursor-move"
            onClick={(e) => {
              e.stopPropagation()
              onTableClick()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              onTableDragStart(e)
            }}
            style={{ pointerEvents: 'all' } as any}
          />
        )}

        {/* Table Name - Counter-rotate to stay upright */}
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#374151"
          transform={`rotate(${-(rotazione || 0)})`}
          style={{ pointerEvents: 'none', userSelect: 'none' } as any}
        >
          {nome}
        </text>
      </g>

      {/* Seats - Don't rotate */}
      {seatPositions.map((pos, index) => {
        const assignment = assignments[index]
        const guest = assignment?.guest

        const borderColor = guest
          ? guest.rsvp_status === 'Ci sarò'
            ? '#10B981'
            : guest.rsvp_status === 'In attesa'
              ? '#F59E0B'
              : '#EF4444'
          : '#9CA3AF'

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
            onMouseEnter={(e) => onSeatMouseEnter?.(guest, e)}
            onMouseLeave={onSeatMouseLeave}
          />
        )
      })}
    </g>
  );
};

export default TavoloSVG;
