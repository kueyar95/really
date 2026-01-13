import { IsString, IsArray, IsObject, IsOptional } from 'class-validator';

export class TryChatDto {
  @IsString()
  message: string;

  @IsArray()
  chatHistory: { role: string; content: string }[];

  @IsString()
  systemPrompt: string;

  @IsObject()
  botConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
} 