import { Badge } from "@/components/ui/badge";

interface WhatsAppStatusBadgeProps {
  status: string | null;
}

export function WhatsAppStatusBadge({ status }: WhatsAppStatusBadgeProps) {
  if (!status) return null;
  
  const statusConfig = {
    delivered: {
      label: 'WhatsApp ricevuto',
      className: 'bg-green-50 text-green-700 border border-green-200'
    },
    sent: {
      label: 'WhatsApp inviato',
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    },
    failed: {
      label: 'WhatsApp errore',
      className: 'bg-red-50 text-red-700 border border-red-200'
    },
    read: {
      label: 'WhatsApp letto',
      className: 'bg-green-50 text-green-700 border border-green-200'
    }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;
  
  return (
    <Badge 
      className={`text-xs px-2 py-0.5 ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
