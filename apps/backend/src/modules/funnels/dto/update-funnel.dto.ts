import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateFunnelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channelIds?: string[];
}
