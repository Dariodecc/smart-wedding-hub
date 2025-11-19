import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const MatrimoniDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/matrimoni")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Dettagli Matrimonio</h1>
          <p className="text-muted-foreground mt-1">ID: {id}</p>
        </div>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Questa pagina verrà popolata con i dettagli del matrimonio
        </p>
      </div>
    </div>
  );
};

export default MatrimoniDetail;
