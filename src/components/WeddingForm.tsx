import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Euro, X, Heart, MapPin, Users, Globe, Link } from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation('matrimoni');
  const [spouseSearchOpen, setSpouseSearchOpen] = useState(false);
  
  const dateLocale = i18n.language === 'it' ? it : enUS;

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
      
      {/* Section: Couple Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center">
            <Heart className="h-4 w-4 text-pink-600" />
          </div>
          <h3 className="font-semibold text-gray-900">
            {t('form.sections.coupleInfo')}
          </h3>
        </div>
        
        {/* Couple Name */}
        <div className="space-y-2">
          <Label htmlFor="couple_name">
            {t('form.coupleName')} <span className="text-red-500">{t('form.coupleNameRequired')}</span>
          </Label>
          <Input
            id="couple_name"
            value={formData.couple_name}
            onChange={(e) => setFormData({ ...formData, couple_name: e.target.value })}
            placeholder={t('form.coupleNamePlaceholder')}
            className="h-11"
            required
          />
        </div>

        {/* Spouse Users */}
        <div className="space-y-2">
          <Label>
            {t('form.users')} <span className="text-red-500">{t('form.usersRequired')}</span>
          </Label>
          <Popover open={spouseSearchOpen} onOpenChange={setSpouseSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-start text-left font-normal h-11"
              >
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                {t('form.usersPlaceholder')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={t('form.usersSearchPlaceholder')} />
                <CommandEmpty>{t('form.usersNoResults')}</CommandEmpty>
                <CommandGroup>
                  {availableSpouses.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => toggleSpouse(user.id)}
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
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section: Event Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">
            {t('form.sections.eventDetails')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Wedding Date */}
          <div className="space-y-2">
            <Label>
              {t('form.weddingDate')} <span className="text-red-500">{t('form.weddingDateRequired')}</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    !formData.wedding_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.wedding_date ? (
                    format(formData.wedding_date, "PPP", { locale: dateLocale })
                  ) : (
                    <span>{t('form.weddingDatePlaceholder')}</span>
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
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Service Cost */}
          <div className="space-y-2">
            <Label htmlFor="service_cost">
              {t('form.serviceCost')} <span className="text-red-500">{t('form.serviceCostRequired')}</span>
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="service_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.service_cost}
                onChange={(e) => setFormData({ ...formData, service_cost: e.target.value })}
                className="pl-9 h-11"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Locations */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">
            {t('form.sections.locations')}
          </h3>
        </div>

        {/* Ceremony Location */}
        <div className="space-y-2">
          <Label htmlFor="ceremony_location">
            {t('form.ceremonyLocation')} <span className="text-red-500">{t('form.ceremonyLocationRequired')}</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="ceremony_location"
              value={formData.ceremony_location}
              onChange={(e) => setFormData({ ...formData, ceremony_location: e.target.value })}
              placeholder={t('form.ceremonyLocationPlaceholder')}
              className="pl-9 h-11"
              required
            />
          </div>
        </div>

        {/* Reception Location */}
        <div className="space-y-2">
          <Label htmlFor="reception_location">
            {t('form.receptionLocation')}
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reception_location"
              value={formData.reception_location}
              onChange={(e) => setFormData({ ...formData, reception_location: e.target.value })}
              placeholder={t('form.receptionLocationPlaceholder')}
              className="pl-9 h-11"
            />
          </div>
        </div>
      </div>

      {/* Section: Advanced Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Globe className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">
            {t('form.sections.settings')}
          </h3>
        </div>

        {/* Multi RSVP Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="enable_multi_rsvp" className="cursor-pointer">
              {t('form.enableMultiRsvp')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('form.enableMultiRsvpDescription')}
            </p>
          </div>
          <Switch
            id="enable_multi_rsvp"
            checked={formData.enable_multi_rsvp}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enable_multi_rsvp: checked })
            }
          />
        </div>

        {/* Webhook URL (conditional) */}
        {formData.enable_multi_rsvp && (
          <div className="space-y-2 pl-4 border-l-2 border-purple-200">
            <Label htmlFor="webhook_url">
              {t('form.webhookUrl')}
            </Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="webhook_url"
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder={t('form.webhookUrlPlaceholder')}
                className="pl-9 h-11"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('form.webhookUrlDescription')}
            </p>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('form.buttons.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-pink-600 hover:bg-pink-700">
          {isSubmitting 
            ? (isEditing ? t('form.buttons.updating') : t('form.buttons.creating'))
            : (isEditing ? t('form.buttons.update') : t('form.buttons.create'))
          }
        </Button>
      </div>
    </form>
  );
};
