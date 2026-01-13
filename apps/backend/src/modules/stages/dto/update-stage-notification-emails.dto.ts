import { IsArray, IsEmail, IsOptional } from 'class-validator';

export class UpdateStageNotificationEmailsDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional() // Para permitir enviar un array vacío y limpiar las notificaciones
  notificationEmails?: string[];
} 