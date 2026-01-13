import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOnboardingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  website?: string;
} 