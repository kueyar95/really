import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { UUID } from 'crypto';
export class UserSignupDto {
  @IsString()
  @IsNotEmpty()
  supabaseId: UUID;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;
} 