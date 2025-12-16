import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Heart, Calendar, MapPin, Users, CheckCircle2, XCircle, Clock,
  User, Baby, ChevronLeft, ChevronRight, Save, Loader2, Edit,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "@/hooks/use-toast";

interface FormData {
  rsvp_status: string;
  nome: string;
  cognome: string;
  email: string;
  preferenze_alimentari: string[];
}

const Rsvp = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch guest/family data by RSVP UUID using secure RPC functions
  const { data: rsvpData, isLoading } = useQuery({
    queryKey: ['rsvp', uuid],
    queryFn: async () => {
      // Use secure RPC function to get guest data
      const { data: guestData, error: guestError } = await supabase
        .rpc('get_rsvp_guest_data', { _rsvp_uuid: uuid });

      if (guestError) throw guestError;
      if (!guestData || guestData.length === 0) return null;

      const mainGuest = guestData[0];

      // Fetch wedding data using secure RPC function
      const { data: weddingData, error: weddingError } = await supabase
        .rpc('get_wedding_for_rsvp', { _rsvp_uuid: uuid });

      if (weddingError) {
        console.error('Error fetching wedding:', weddingError);
      }

      const wedding = weddingData?.[0] || null;

      // If guest is capofamiglia, fetch all family members using secure RPC
      if (mainGuest.is_capo_famiglia && mainGuest.famiglia_id) {
        const { data: familyMembers, error: familyError } = await supabase
          .rpc('get_rsvp_family_members', { 
            _famiglia_id: mainGuest.famiglia_id,
            _rsvp_uuid: uuid
          });

        if (familyError) throw familyError;

        return {
          mainGuest,
          familyMembers: familyMembers || [],
          isFamily: true,
          wedding
        };
      }

      // Single guest
      return {
        mainGuest,
        familyMembers: [mainGuest],
        isFamily: false,
        wedding
      };
    },
    enabled: !!uuid
  });

  // Initialize form data from fetched guests
  useEffect(() => {
    if (rsvpData?.familyMembers) {
      const initialData: Record<string, FormData> = {};
      rsvpData.familyMembers.forEach((member: any) => {
        initialData[member.id] = {
          rsvp_status: member.rsvp_status || 'In attesa',
          nome: member.nome || '',
          cognome: member.cognome || '',
          email: member.email || '',
          preferenze_alimentari: member.preferenze_alimentari || []
        };
      });
      setFormData(initialData);
    }
  }, [rsvpData]);

  const updateField = (guestId: string, field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        [field]: value
      }
    }));
  };

  const isCurrentStepValid = () => {
    if (!rsvpData) return false;
    const member = rsvpData.familyMembers[currentStep];
    const data = formData[member.id];

    return !!(
      data?.rsvp_status &&
      data?.nome?.trim() &&
      data?.cognome?.trim() &&
      data?.preferenze_alimentari?.length > 0
    );
  };

  const isFormValid = () => {
    if (!rsvpData) return false;
    return rsvpData.familyMembers.every((member: any) => {
      const data = formData[member.id];
      return !!(
        data?.rsvp_status &&
        data?.nome?.trim() &&
        data?.cognome?.trim() &&
        data?.preferenze_alimentari?.length > 0
      );
    });
  };

  const handleNext = () => {
    if (isCurrentStepValid()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !rsvpData || !uuid) return;

    setIsSubmitting(true);

    try {
      // Update each family member using secure RPC function
      for (const member of rsvpData.familyMembers) {
        const data = formData[member.id];
        
        const { data: success, error } = await supabase
          .rpc('update_rsvp_guest', {
            _guest_id: member.id,
            _rsvp_uuid: uuid,
            _rsvp_status: data.rsvp_status,
            _nome: data.nome.trim().slice(0, 100),
            _cognome: data.cognome.trim().slice(0, 100),
            _email: data.email?.trim().slice(0, 255) || null,
            _preferenze_alimentari: data.preferenze_alimentari
          });

        if (error) throw error;
        if (!success) throw new Error('Update failed - unauthorized');
      }

      toast({
        title: "Successo!",
        description: rsvpData.isFamily 
          ? 'Dati famiglia aggiornati con successo!' 
          : 'RSVP confermato con successo!'
      });

      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mb-4" />
          <p className="text-gray-600">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid link)
  if (!rsvpData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Link non valido
            </h2>
            <p className="text-gray-600">
              Il link RSVP non è valido o è scaduto. Contatta gli sposi per ricevere un nuovo invito.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { mainGuest, familyMembers, isFamily, wedding } = rsvpData;

  // Default dietary preferences
  const dietaryOptions = [
    { value: 'Onnivoro', label: 'Onnivoro' },
    { value: 'Vegetariano', label: 'Vegetariano' },
    { value: 'Vegano', label: 'Vegano' },
    { value: 'Celiaco', label: 'Celiaco (senza glutine)' },
    { value: 'Intollerante al lattosio', label: 'Intollerante al lattosio' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Wedding Info Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Heart className="h-8 w-8 text-pink-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {wedding.couple_name}
          </h1>
          <p className="text-lg text-gray-600 flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            {wedding.wedding_date && new Date(wedding.wedding_date).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          {wedding.ceremony_location && (
            <p className="text-gray-600 flex items-center justify-center gap-2 mt-1">
              <MapPin className="h-5 w-5" />
              {wedding.ceremony_location}
            </p>
          )}
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          {!showSuccess ? (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {isFamily 
                    ? `Conferma presenza - Famiglia ${mainGuest.famiglia?.nome || ''}`
                    : 'Conferma la tua presenza'
                  }
                </CardTitle>
                <CardDescription>
                  {isFamily
                    ? 'Compila i dati per te e i tuoi familiari'
                    : 'Compila i tuoi dati per confermare la presenza'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Step Navigation for Families */}
                {isFamily && familyMembers.length > 1 && (
                  <div className="flex items-center justify-between mb-6 pb-4 border-b">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-500" />
                      <span className="font-medium">
                        Membro {currentStep + 1} di {familyMembers.length}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {familyMembers.map((_: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`h-2 w-8 rounded-full transition-colors ${
                            index === currentStep 
                              ? 'bg-pink-500' 
                              : index < currentStep 
                                ? 'bg-green-500' 
                                : 'bg-gray-200'
                          }`}
                          aria-label={`Vai al membro ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Fields for Each Guest */}
                {familyMembers.map((member: any, index: number) => (
                  <div 
                    key={member.id}
                    className={currentStep === index ? 'block' : 'hidden'}
                  >
                    {/* Guest name header */}
                    <div className="mb-6 pb-4 border-b">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {member.nome} {member.cognome}
                      </h3>
                      {member.is_capo_famiglia && (
                        <Badge variant="secondary" className="mt-2">
                          Capofamiglia
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-6">
                      {/* 1. RSVP Status - REQUIRED */}
                      <div>
                        <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                          Conferma presenza
                          <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup
                          value={formData[member.id]?.rsvp_status || ''}
                          onValueChange={(value) => updateField(member.id, 'rsvp_status', value)}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                              <RadioGroupItem value="Ci sarò" id={`yes-${member.id}`} />
                              <Label 
                                htmlFor={`yes-${member.id}`} 
                                className="flex items-center gap-2 cursor-pointer flex-1"
                              >
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Ci sarò</span>
                              </Label>
                            </div>
                            
                            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                              <RadioGroupItem value="Non ci sarò" id={`no-${member.id}`} />
                              <Label 
                                htmlFor={`no-${member.id}`}
                                className="flex items-center gap-2 cursor-pointer flex-1"
                              >
                                <XCircle className="h-5 w-5 text-red-600" />
                                <span className="font-medium">Non ci sarò</span>
                              </Label>
                            </div>
                            
                            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                              <RadioGroupItem value="In attesa" id={`pending-${member.id}`} />
                              <Label 
                                htmlFor={`pending-${member.id}`}
                                className="flex items-center gap-2 cursor-pointer flex-1"
                              >
                                <Clock className="h-5 w-5 text-orange-600" />
                                <span className="font-medium">Devo ancora decidere</span>
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* 2. Nome - REQUIRED */}
                      <div>
                        <Label htmlFor={`nome-${member.id}`} className="text-base font-semibold">
                          Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`nome-${member.id}`}
                          value={formData[member.id]?.nome || ''}
                          onChange={(e) => updateField(member.id, 'nome', e.target.value)}
                          placeholder="Inserisci il nome"
                          className="mt-2"
                          required
                        />
                      </div>

                      {/* 3. Cognome - REQUIRED */}
                      <div>
                        <Label htmlFor={`cognome-${member.id}`} className="text-base font-semibold">
                          Cognome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`cognome-${member.id}`}
                          value={formData[member.id]?.cognome || ''}
                          onChange={(e) => updateField(member.id, 'cognome', e.target.value)}
                          placeholder="Inserisci il cognome"
                          className="mt-2"
                          required
                        />
                      </div>

                      {/* 4. Email - OPTIONAL */}
                      <div>
                        <Label htmlFor={`email-${member.id}`} className="text-base font-semibold">
                          Email <span className="text-gray-500 text-sm font-normal">(facoltativo)</span>
                        </Label>
                        <Input
                          id={`email-${member.id}`}
                          type="email"
                          value={formData[member.id]?.email || ''}
                          onChange={(e) => updateField(member.id, 'email', e.target.value)}
                          placeholder="esempio@email.com"
                          className="mt-2"
                        />
                      </div>

                      {/* 5. Preferenze Alimentari - REQUIRED */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block">
                          Preferenze alimentari <span className="text-red-500">*</span>
                        </Label>
                        <MultiSelect
                          options={dietaryOptions}
                          selected={formData[member.id]?.preferenze_alimentari || []}
                          onChange={(selected) => updateField(member.id, 'preferenze_alimentari', selected)}
                          placeholder="Seleziona preferenze alimentari..."
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Puoi selezionare più opzioni
                        </p>
                      </div>

                      {/* 6. Tipo Ospite - READ ONLY */}
                      <div>
                        <Label className="text-base font-semibold mb-2 block">
                          Tipo di ospite
                        </Label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                          {member.tipo_ospite === 'Adulto' && (
                            <>
                              <User className="h-5 w-5 text-blue-600" />
                              <span className="font-medium">Adulto</span>
                            </>
                          )}
                          {member.tipo_ospite === 'Ragazzo' && (
                            <>
                              <User className="h-5 w-5 text-purple-600" />
                              <span className="font-medium">Ragazzo</span>
                            </>
                          )}
                          {member.tipo_ospite === 'Bambino' && (
                            <>
                              <Baby className="h-5 w-5 text-purple-600" />
                              <span className="font-medium">Bambino</span>
                            </>
                          )}
                          {member.tipo_ospite === 'Neonato' && (
                            <>
                              <Baby className="h-5 w-5 text-pink-600" />
                              <span className="font-medium">Neonato</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t">
                  {/* Back button */}
                  {isFamily && currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(prev => prev - 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Precedente
                    </Button>
                  )}

                  {/* Next/Submit button */}
                  {isFamily && currentStep < familyMembers.length - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex-1"
                      disabled={!isCurrentStepValid()}
                    >
                      Successivo
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      disabled={!isFormValid() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Conferma RSVP
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            /* Success Screen */
            <CardContent className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Grazie!
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                {isFamily 
                  ? 'I dati della famiglia sono stati salvati con successo.'
                  : 'La tua conferma è stata ricevuta.'
                }
              </p>
              <p className="text-gray-600 mb-8">
                Puoi modificare le tue scelte in qualsiasi momento usando questo link.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccess(false);
                    setCurrentStep(0);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica Dati
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Rsvp;
