import { IsString, IsNotEmpty } from 'class-validator';

export class WhatsAppCloudConfigDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  businessAccountId: string;

  @IsString()
  @IsNotEmpty()
  webhookVerifyToken: string;
}