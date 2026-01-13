interface RagConfig {
  sources?: string[];
  model?: string;
  settings?: {
    [key: string]: string | number | boolean;
  };
}

export interface FunctionsConfig {
  enabled: boolean;
  functions?: {
    name: string;
    description: string;
    parameters: {
      [key: string]: string | number | boolean;
    };
  }[];
}

export interface MainConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface BotConfig extends MainConfig {
  name: string;
  sysPrompt: PromptBlock[];
  steps?: Step[];
}

export interface StepFunction {
  id: string;
  name: string;
  external_name?: string;
  description?: string;
  activation?: string;
}

export interface Step {
  text: string;
  number: number;
  functions: (string | StepFunction)[];
}

export interface AiBot {
  id: string;
  companyId: string;
  name: string;
  mainConfig?: MainConfig;
  ragConfig?: RagConfig;
  functionsConfig?: FunctionsConfig;
  sysPrompt?: PromptBlock[];
  steps?: Step[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GetBotsResponse {
  bots: AiBot[];
}

export interface PromptBlock {
  block_identifier: string;
  block_content: string;
  block_name?: string;
}

export const DEFAULT_PROMPT_BLOCKS: PromptBlock[] = [
  {
    block_identifier: "personification",
    block_content: ""
  },
  {
    block_identifier: "objective",
    block_content: ""
  },
  {
    block_identifier: "communication_context",
    block_content: ""
  },
  {
    block_identifier: "possible_cases",
    block_content: ""
  },
  {
    block_identifier: "predefined_behavior",
    block_content: ""
  },
  {
    block_identifier: "store_info",
    block_content: ""
  },
  {
    block_identifier: "product_info",
    block_content: ""
  },
  {
    block_identifier: "key_info",
    block_content: ""
  },
  {
    block_identifier: "response_format",
    block_content: ""
  },
  {
    block_identifier: "dont_do",
    block_content: ""
  }
];
