import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
} 