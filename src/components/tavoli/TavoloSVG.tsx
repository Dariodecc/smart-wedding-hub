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
  const seatWidth = 90
  const minLength = 300
  return Math.max(minLength, capienza * seatWidth / 2)
}

// Calculate seats in circle (for round table)
const calculateCircleSeats = (count: number, radius: number) => {
  const seats = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2;
    seats.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: (angle + Math.PI / 2) * (180 / Math.PI), // Seats face inward
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
  const seatWidth = 70
  const totalSeatsWidth = count * seatWidth
  const spacing = (tableLength - totalSeatsWidth) / (count + 1)
  const startX = -tableLength / 2 + spacing

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + (seatWidth + spacing) * i + seatWidth / 2,
      y: -80,
      rotation: 0
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
  const topSeats = Math.floor(count / 2)
  const bottomSeats = Math.ceil(count / 2)
  
  const seatWidth = 70
  
  // Top side
  const topSeatsWidth = topSeats * seatWidth
  const topSpacing = (tableLength - topSeatsWidth) / (topSeats + 1)
  const topStartX = -tableLength / 2 + topSpacing
  
  for (let i = 0; i < topSeats; i++) {
    positions.push({
      x: topStartX + (seatWidth + topSpacing) * i + seatWidth / 2,
      y: -90,
      rotation: 0
    })
  }
  
  // Bottom side
  const bottomSeatsWidth = bottomSeats * seatWidth
  const bottomSpacing = (tableLength - bottomSeatsWidth) / (bottomSeats + 1)
  const bottomStartX = -tableLength / 2 + bottomSpacing
  
  for (let i = 0; i < bottomSeats; i++) {
    positions.push({
      x: bottomStartX + (seatWidth + bottomSpacing) * i + seatWidth / 2,
      y: 90,
      rotation: 180
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
      return calculateCircleSeats(capienza, 140)
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
      {/* Everything inside this group rotates together */}
      <g transform={`rotate(${rotazione || 0})`}>
        {/* Selection Highlight */}
        {isSelected && (
          <>
            {tipo === 'rotondo' && (
              <circle
                cx="0"
                cy="0"
                r="155"
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
                y="-90"
                width={tableLength + 40}
                height="170"
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
                y="-100"
                width={tableLength + 40}
                height="200"
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

        {/* Seats - Rotate WITH table */}
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
    </g>
  );
};

export default TavoloSVG;
