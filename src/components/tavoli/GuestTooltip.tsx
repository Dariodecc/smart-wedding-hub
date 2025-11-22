import React from 'react'
import { Crown, Users, Utensils, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuestTooltipProps {
  guest: any
  position: { x: number; y: number }
  visible: boolean
}

export const GuestTooltip: React.FC<GuestTooltipProps> = ({ 
  guest, 
  position, 
  visible 
}) => {
  if (!visible || !guest) return null
  
  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-4 min-w-[280px] max-w-[320px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {guest.nome[0]}{guest.cognome[0]}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-base">
              {guest.nome} {guest.cognome}
            </h3>
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1",
              guest.rsvp_status === "Ci sarò" && "bg-green-100 text-green-800",
              guest.rsvp_status === "In attesa" && "bg-yellow-100 text-yellow-800",
              guest.rsvp_status === "Non ci sarò" && "bg-red-100 text-red-800"
            )}>
              {guest.rsvp_status}
            </div>
          </div>
        </div>
        
        {/* Info Grid */}
        <div className="space-y-2.5">
          {/* Capo Famiglia */}
          {guest.is_capo_famiglia && (
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="font-medium text-yellow-700">Capo Famiglia</span>
            </div>
          )}
          
          {/* Tipo Ospite */}
          <div className="flex items-start gap-2 text-sm">
            <UserCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-500 text-xs">Tipo Ospite</span>
              <p className="font-medium text-gray-900">{guest.tipo_ospite}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
