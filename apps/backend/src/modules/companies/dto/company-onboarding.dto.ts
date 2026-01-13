import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CompanyOnboardingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsNotEmpty()
  supabaseUserId: string;
} 