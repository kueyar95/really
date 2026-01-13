import { Button } from "@/components/ui/button"
import { GitFork } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function FunnelStatsButton({ companyId, funnelsCount }: { companyId: string, funnelsCount: number }) {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="space-x-1"
            onClick={() => navigate(`/dashboard/super/companies/${companyId}/funnels`)}
          >
            <GitFork className="h-4 w-4" />
            <span>{funnelsCount}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver Funnels</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}