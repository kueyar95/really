import { useQuery } from "@tanstack/react-query";
import { BotsService } from "@/services/Bots/queries";
import { columns } from "./components/columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/DataTable/DataTable";

export default function BotsPage() {
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: BotsService.getAllBots,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8 bg-white rounded-lg shadow-sm m-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bots</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Crear Bot
        </Button>
      </div>

      <div className="rounded-md border">
        <DataTable columns={columns} data={bots || []} />
      </div>
    </div>
  );
}
