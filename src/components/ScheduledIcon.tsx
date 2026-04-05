import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ScheduledIcon({ date }: { date: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="p-1 rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Agendado para: {new Date(date).toLocaleDateString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}