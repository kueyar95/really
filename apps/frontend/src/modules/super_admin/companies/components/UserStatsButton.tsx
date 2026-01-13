import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function UserStatsButton({ companyId, usersCount }: { companyId: string, usersCount: number }) {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="space-x-1"
            onClick={() => navigate(`/dashboard/super/companies/${companyId}/users`)}
          >
            <Users className="h-4 w-4" />
            <span>{usersCount}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver Usuarios</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}