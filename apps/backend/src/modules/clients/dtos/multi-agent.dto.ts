import { IsNotEmpty, IsString } from 'class-validator';

export class MultiAgentRequestDto {
  @IsNotEmpty()
  @IsString()
  input: string;

  @IsNotEmpty()
  @IsString()
  sessionId: string;
}