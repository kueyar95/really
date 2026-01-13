import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateFunnelDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  channelIds: string[];

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
