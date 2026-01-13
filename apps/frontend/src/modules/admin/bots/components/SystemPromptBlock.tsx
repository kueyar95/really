import { Card } from "@/components/ui/card";
import { PromptBlock } from "@/services/Bots/types";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Step {
  number: number;
  text: string;
  functions: string;
}

function getSteps(steps: Step[]): React.ReactNode {
  return (
    <>
      {steps.map((step) => (
        <div key={step.number}>
          <h3 className="text-[14px] text-gray-700">{step.number}. {step.text}</h3>
          {/* <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{step.functions}</p> */}
        </div>
      ))}
    </>
  )
}

export function SystemPromptBlock({ block, onClick }: { block: PromptBlock, onClick: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);


  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick();
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:bg-gray-50"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex justify-between items-center p-4">
        <h3 className="text-sm font-medium">{block.block_name}</h3>
        <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      {isExpanded && (
        <div className="relative px-2 pb-2">
          <ScrollArea className="h-[200px] w-full rounded-md">
            <div className="p-2">
              {block.block_identifier === "steps_to_follow" ? getSteps(JSON.parse(block.block_content)) : (
                <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{block.block_content}</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}