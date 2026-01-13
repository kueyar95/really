import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateWhapiChannelDto {
  @IsNotEmpty()
  @IsUUID()
  companyId: string;
} 