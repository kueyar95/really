import { IsString, IsNotEmpty, IsEmail, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateClientDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
