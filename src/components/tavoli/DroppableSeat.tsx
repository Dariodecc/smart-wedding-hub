import { useDroppable } from "@dnd-kit/core";

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
      ref={setNodeRef as any}
      onClick={onSeatClick}
      className="cursor-pointer"
    >
      {/* Seat Background */}
      <rect
        x="-35"
        y="-25"
        width="70"
        height="50"
        rx="8"
        fill={isOver ? "#DBEAFE" : guest ? "#ffffff" : "#F3F4F6"}
        stroke={borderColor}
        strokeWidth="3"
      />

      {/* Chair Icon/Shape */}
      <rect
        x="-30"
        y="-28"
        width="60"
        height="6"
        rx="3"
        fill={borderColor}
      />

      {guest ? (
        <>
          {/* Guest Initials */}
          <text
            x="0"
            y="-5"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#374151"
          >
            {guest.nome[0]}
            {guest.cognome[0]}
          </text>

          {/* Guest Name */}
          <text x="0" y="10" textAnchor="middle" fontSize="10" fill="#6B7280">
            {guest.nome}
          </text>
          <text x="0" y="20" textAnchor="middle" fontSize="10" fill="#6B7280">
            {guest.cognome}
          </text>
        </>
      ) : (
        <text x="0" y="5" textAnchor="middle" fontSize="12" fill="#9CA3AF">
          Libero
        </text>
      )}
    </g>
  );
};

export default DroppableSeat;
