import { PromptBlock } from "@/services/Bots/types";
import { BotConfig } from "@/services/Bots/types";
import { Step } from "@/services/Bots/types";

export interface TemplateBlock {
  block_identifier: string;
  block_content: string;
}

export interface StageBlocks {
  stage: string;
  blocks: TemplateBlock[];
  steps?: Step[];
}

export interface TemplateBlocks {
  id: string;
  name: string;
  description: string;
  icon: string;
  stages: StageBlocks[];
  functions?: any[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  stages: {
    name: string;
    description: string;
    isHuman: boolean;
    bot: BotConfig | null;
  }[];
  functions?: any[];
} 