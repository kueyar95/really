import { IsString, IsOptional, IsIn } from 'class-validator';

export class FbSendTextDto {
  @IsString()
  pageAccessToken!: string; // persistido por tenant tras OAuth

  @IsString()
  recipientId!: string; // PSID (Messenger) o IG SID

  @IsString()
  text!: string;

  @IsOptional()
  @IsIn(['RESPONSE', 'UPDATE'])
  messaging_type?: 'RESPONSE' | 'UPDATE'; // por defecto RESPONSE (24h)
}
