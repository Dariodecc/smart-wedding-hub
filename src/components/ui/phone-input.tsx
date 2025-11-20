import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "340 123 4567",
  className,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  
  // Parse existing value to extract country code and number
  const parseValue = (val: string) => {
    if (!val) return { country: COUNTRIES[0], number: "" };
    
    const country = COUNTRIES.find(c => val.startsWith(c.dialCode));
    if (country) {
      const number = val.substring(country.dialCode.length);
      return { country, number };
    }
    return { country: COUNTRIES[0], number: val };
  };

  const { country: initialCountry, number: initialNumber } = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    const fullNumber = country.dialCode + phoneNumber.replace(/\s/g, "");
    onChange(fullNumber);
    setOpen(false);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow only numbers and spaces
    const cleaned = input.replace(/[^\d\s]/g, "");
    setPhoneNumber(cleaned);
    const fullNumber = selectedCountry.dialCode + cleaned.replace(/\s/g, "");
    onChange(fullNumber);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[120px] justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl leading-none">{selectedCountry.flag}</span>
              <span className="text-sm text-muted-foreground">
                {selectedCountry.dialCode}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cerca paese..." className="h-9" />
            <CommandList>
              <CommandEmpty>Nessun paese trovato.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => handleCountryChange(country)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {country.dialCode}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        type="tel"
        placeholder={placeholder}
        value={phoneNumber}
        onChange={handleNumberChange}
        className="flex-1"
      />
    </div>
  );
}
