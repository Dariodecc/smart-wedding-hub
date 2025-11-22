import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Euro, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface SpouseUser {
  id: string;
  email: string;
}

interface FormData {
  couple_name: string;
  wedding_date: Date;
  ceremony_location: string;
  reception_location: string;
  service_cost: string;
  enable_multi_rsvp: boolean;
  webhook_url: string;
  selected_spouses: string[];
  api_username: string;
  api_password: string;
}

interface WeddingFormProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
  availableSpouses: SpouseUser[];
  getSpouseEmail: (userId: string) => string;
}

export const WeddingForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
  availableSpouses,
  getSpouseEmail,
}: WeddingFormProps) => {
  const [spouseSearchOpen, setSpouseSearchOpen] = useState(false);

  const toggleSpouse = (userId: string) => {
    setFormData({
      ...formData,
      selected_spouses: formData.selected_spouses.includes(userId)
        ? formData.selected_spouses.filter(id => id !== userId)
        : [...formData.selected_spouses, userId],
    });
  };

  const removeSpouse = (userId: string) => {
    setFormData({
      ...formData,
      selected_spouses: formData.selected_spouses.filter(id => id !== userId),
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="couple_name">Nome della coppia *</Label>
        <Input
          id="couple_name"
          value={formData.couple_name}
          onChange={(e) => setFormData({ ...formData, couple_name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Utenti Sposi *</Label>
        <Popover open={spouseSearchOpen} onOpenChange={setSpouseSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-start text-left font-normal"
            >
              Seleziona utenti sposi
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Cerca utente..." />
              <CommandEmpty>Nessun utente trovato.</CommandEmpty>
              <CommandGroup>
                {availableSpouses.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => {
                      toggleSpouse(user.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.selected_spouses.includes(user.id)}
                        readOnly
                        className="h-4 w-4"
                      />
                      <span>{user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {formData.selected_spouses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.selected_spouses.map((userId) => (
              <Badge key={userId} variant="secondary" className="gap-1">
                {getSpouseEmail(userId)}
                <button
                  type="button"
                  onClick={() => removeSpouse(userId)}
                  className="ml-1 hover:bg-muted rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Data del matrimonio *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.wedding_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.wedding_date ? (
                format(formData.wedding_date, "PPP", { locale: it })
              ) : (
                <span>Seleziona una data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.wedding_date}
              onSelect={(date) => date && setFormData({ ...formData, wedding_date: date })}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ceremony_location">Location della cerimonia *</Label>
        <Input
          id="ceremony_location"
          value={formData.ceremony_location}
          onChange={(e) => setFormData({ ...formData, ceremony_location: e.target.value })}
          placeholder="Via, Città, CAP"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reception_location">Location della sala</Label>
        <Input
          id="reception_location"
          value={formData.reception_location}
          onChange={(e) => setFormData({ ...formData, reception_location: e.target.value })}
          placeholder="Via, Città, CAP (opzionale)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_cost">Costo servizio (€) *</Label>
        <div className="relative">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="service_cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.service_cost}
            onChange={(e) => setFormData({ ...formData, service_cost: e.target.value })}
            className="pl-9"
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enable_multi_rsvp">Abilita RSVP multiplo</Label>
          <Switch
            id="enable_multi_rsvp"
            checked={formData.enable_multi_rsvp}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enable_multi_rsvp: checked })
            }
          />
        </div>

        {formData.enable_multi_rsvp && (
          <div className="space-y-2 pl-4">
            <Label htmlFor="webhook_url">URL Webhook</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-medium">Credenziali API</h3>
        <p className="text-xs text-muted-foreground">
          Genera credenziali per l'accesso API agli invitati
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="api_username">Username API</Label>
            <Input
              id="api_username"
              value={formData.api_username}
              onChange={(e) => setFormData({ ...formData, api_username: e.target.value })}
              placeholder="api_user"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_password">Password API</Label>
            <Input
              id="api_password"
              type="password"
              value={formData.api_password}
              onChange={(e) => setFormData({ ...formData, api_password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? "Aggiorna" : "Crea"} Matrimonio
        </Button>
      </div>
    </form>
  );
};
