import { useParams } from "react-router-dom";
import { Heart } from "lucide-react";

const Rsvp = () => {
  const { uuid } = useParams<{ uuid: string }>();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Heart className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">RSVP</h1>
        <p className="text-muted-foreground">
          Questa pagina RSVP verrà implementata prossimamente.
        </p>
        {uuid && (
          <p className="text-xs text-muted-foreground font-mono">
            UUID: {uuid}
          </p>
        )}
      </div>
    </div>
  );
};

export default Rsvp;
