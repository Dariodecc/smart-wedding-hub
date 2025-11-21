import { useDraggable } from "@dnd-kit/core";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DraggableGuestProps {
  guest: {
    id: string;
    nome: string;
    cognome: string;
    tipo_ospite: string;
    rsvp_status: string;
    is_capo_famiglia: boolean;
  };
}

const DraggableGuest = ({ guest }: DraggableGuestProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { guest },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : "auto",
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const rsvpColor = {
    "Ci sarò": "border-green-500 bg-green-50",
    "In attesa": "border-yellow-500 bg-yellow-50",
    "Non ci sarò": "border-red-500 bg-red-50",
  }[guest.rsvp_status] || "border-gray-300 bg-white";

  return (
    <div
      ref={setNodeRef}
      style={style as any}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all",
        rsvpColor,
        isDragging && "shadow-lg"
      )}
    >
      {/* Avatar */}
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
        {guest.nome[0]}
        {guest.cognome[0]}
      </div>

      {/* Guest Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {guest.nome} {guest.cognome}
          </p>
          {guest.is_capo_famiglia && (
            <Crown className="h-3 w-3 text-yellow-600 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
            {guest.tipo_ospite}
          </Badge>
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              guest.rsvp_status === "Ci sarò" && "bg-green-500",
              guest.rsvp_status === "In attesa" && "bg-yellow-500",
              guest.rsvp_status === "Non ci sarò" && "bg-red-500"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default DraggableGuest;
