import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { PatientLink } from '../entities/patient-link.entity';
import { E164Service } from '../utils/e164.service';

export interface WhatsAppTemplateParams {
  toE164: string;
  templateName: string;
  languageCode: string;
  components?: {
    type: 'body' | 'header';
    parameters: Array<{
      type: 'text' | 'image' | 'document' | 'video';
      text?: string;
      image?: { link: string };
      document?: { link: string; filename?: string };
      video?: { link: string };
    }>;
  }[];
}

export interface AppointmentTemplateData {
  toE164: string;
  patientName: string;
  professionalName: string;
  branchName: string;
  date: string;
  time: string;
  confirmationCode?: string;
}

@Injectable()
export class WhatsAppTemplatesService {
  private readonly logger = new Logger('WhatsAppTemplatesService');
  private readonly graphVersion: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly langCode: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(PatientLink)
    private readonly patientLinkRepo: Repository<PatientLink>,
    private readonly configService: ConfigService,
    private readonly e164Service: E164Service,
  ) {
    this.graphVersion = this.configService.get('medilink.whatsapp.graphVersion') || '20.0';
    this.phoneNumberId = this.configService.get('medilink.whatsapp.phoneNumberId');
    this.accessToken = this.configService.get('medilink.whatsapp.accessToken');
    this.langCode = this.configService.get('medilink.whatsapp.langCode') || 'es_ES';
    this.baseUrl = `https://graph.facebook.com/v${this.graphVersion}`;
  }

  /**
   * Verifica si el usuario tiene opt-in para WhatsApp
   */
  private async checkOptIn(companyId: string, phoneE164: string): Promise<boolean> {
    this.logger.debug(`🔍 [WhatsApp] Verificando opt-in para ${phoneE164} (companyId: ${companyId})`);
    
    const patientLink = await this.patientLinkRepo.findOne({
      where: { companyId, phoneE164 },
    });

    if (!patientLink) {
      this.logger.warn(`⚠️ [WhatsApp] No se encontró link de paciente para ${phoneE164}`);
      return false;
    }

    const hasOptIn = patientLink.optInWhatsapp;
    this.logger.debug(`✅ [WhatsApp] Opt-in para ${phoneE164}: ${hasOptIn}`);
    
    return hasOptIn;
  }

  /**
   * Envía una plantilla de WhatsApp
   */
  private async sendTemplate(params: WhatsAppTemplateParams): Promise<any> {
    const { toE164, templateName, languageCode, components } = params;

    // Validar que WhatsApp esté configurado
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        'WhatsApp no está configurado. Faltan variables: WA_PHONE_NUMBER_ID y/o WA_ACCESS_TOKEN',
      );
    }

    // Validar formato E.164
    if (!this.e164Service.isValid(toE164)) {
      throw new Error(`Número de teléfono inválido: ${toE164}`);
    }

    // Remover el + del número para la API
    const phoneNumber = toE164.substring(1);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components || [],
      },
    };

    this.logger.debug(`📤 [WhatsApp] Enviando plantilla ${templateName} a ${toE164}`);
    this.logger.debug(`📤 [WhatsApp] Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.debug(`✅ [WhatsApp] Plantilla enviada exitosamente: ${response.data.messages[0].id}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        to: toE164,
        template: templateName,
      };
    } catch (error) {
      this.logger.error(`Error enviando plantilla: ${error.message}`);
      
      if (error.response) {
        const errorData = error.response.data;
        this.logger.error(`Respuesta de error: ${JSON.stringify(errorData)}`);

        // Manejar error de idioma incorrecto
        if (errorData.error?.message?.includes('language')) {
          this.logger.warn(
            `Posible problema con el idioma de la plantilla. ` +
            `Verifica que la plantilla ${templateName} tenga una traducción para ${languageCode}`,
          );

          // Intentar con variaciones del código de idioma
          if (languageCode === 'es') {
            //this.logger.log('Reintentando con código de idioma es_ES...');
            return this.sendTemplate({
              ...params,
              languageCode: 'es_ES',
            });
          } else if (languageCode === 'es_ES') {
            //this.logger.log('Reintentando con código de idioma es...');
            return this.sendTemplate({
              ...params,
              languageCode: 'es',
            });
          }
        }

        // Error de plantilla no encontrada
        if (errorData.error?.message?.includes('template')) {
          this.logger.error(
            `La plantilla ${templateName} no existe o no está aprobada. ` +
            `Verifica en Meta Business Suite que la plantilla esté creada y aprobada.`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Formatea fecha para mostrar en español
   */
  private formatDateSpanish(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];

    return `${dayName} ${day} de ${monthName}`;
  }

  /**
   * Envía plantilla de cita creada
   */
  async sendTemplateAppointmentCreated(
    companyId: string,
    data: AppointmentTemplateData,
  ): Promise<any> {
    this.logger.debug(`📅 [WhatsApp] Enviando plantilla de cita creada para ${data.toE164}`);
    this.logger.debug(`📅 [WhatsApp] Datos de la cita: ${JSON.stringify(data, null, 2)}`);
    
    // Verificar opt-in
    const hasOptIn = await this.checkOptIn(companyId, data.toE164);
    if (!hasOptIn) {
      this.logger.warn(`⚠️ [WhatsApp] Usuario ${data.toE164} no tiene opt-in para WhatsApp`);
      return {
        success: false,
        reason: 'No opt-in',
      };
    }

    const templateName = this.configService.get('medilink.whatsapp.templates.citaCreada');
    const formattedDate = this.formatDateSpanish(data.date);
    this.logger.debug(`📅 [WhatsApp] Usando plantilla: ${templateName}, Fecha formateada: ${formattedDate}`);

    return this.sendTemplate({
      toE164: data.toE164,
      templateName,
      languageCode: this.langCode,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.patientName },
            { type: 'text', text: data.professionalName },
            { type: 'text', text: formattedDate },
            { type: 'text', text: data.time },
            { type: 'text', text: data.branchName },
            { type: 'text', text: data.confirmationCode || 'N/A' },
          ],
        },
      ],
    });
  }

  /**
   * Envía plantilla de cita reagendada
   */
  async sendTemplateAppointmentRescheduled(
    companyId: string,
    data: AppointmentTemplateData & { oldDate?: string; oldTime?: string },
  ): Promise<any> {
    this.logger.debug(`🔄 [WhatsApp] Enviando plantilla de cita reagendada para ${data.toE164}`);
    this.logger.debug(`🔄 [WhatsApp] Datos: ${JSON.stringify(data, null, 2)}`);
    
    // Verificar opt-in
    const hasOptIn = await this.checkOptIn(companyId, data.toE164);
    if (!hasOptIn) {
      this.logger.warn(`⚠️ [WhatsApp] Usuario ${data.toE164} no tiene opt-in para WhatsApp`);
      return {
        success: false,
        reason: 'No opt-in',
      };
    }

    const templateName = this.configService.get('medilink.whatsapp.templates.citaReagendada');
    const formattedNewDate = this.formatDateSpanish(data.date);
    this.logger.debug(`🔄 [WhatsApp] Usando plantilla: ${templateName}, Nueva fecha: ${formattedNewDate}`);

    return this.sendTemplate({
      toE164: data.toE164,
      templateName,
      languageCode: this.langCode,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.patientName },
            { type: 'text', text: data.professionalName },
            { type: 'text', text: formattedNewDate },
            { type: 'text', text: data.time },
            { type: 'text', text: data.branchName },
          ],
        },
      ],
    });
  }

  /**
   * Envía plantilla de cita cancelada
   */
  async sendTemplateAppointmentCancelled(
    companyId: string,
    data: Omit<AppointmentTemplateData, 'confirmationCode'>,
  ): Promise<any> {
    this.logger.debug(`❌ [WhatsApp] Enviando plantilla de cita cancelada para ${data.toE164}`);
    this.logger.debug(`❌ [WhatsApp] Datos: ${JSON.stringify(data, null, 2)}`);
    
    // Verificar opt-in
    const hasOptIn = await this.checkOptIn(companyId, data.toE164);
    if (!hasOptIn) {
      this.logger.warn(`⚠️ [WhatsApp] Usuario ${data.toE164} no tiene opt-in para WhatsApp`);
      return {
        success: false,
        reason: 'No opt-in',
      };
    }

    const templateName = this.configService.get('medilink.whatsapp.templates.citaAnulada');
    const formattedDate = this.formatDateSpanish(data.date);
    this.logger.debug(`❌ [WhatsApp] Usando plantilla: ${templateName}, Fecha: ${formattedDate}`);

    return this.sendTemplate({
      toE164: data.toE164,
      templateName,
      languageCode: this.langCode,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.patientName },
            { type: 'text', text: formattedDate },
            { type: 'text', text: data.time },
            { type: 'text', text: data.branchName },
          ],
        },
      ],
    });
  }

  /**
   * Envía una plantilla genérica con parámetros personalizados
   */
  async sendCustomTemplate(
    companyId: string,
    toE164: string,
    templateName: string,
    parameters: string[],
  ): Promise<any> {
    this.logger.debug(`📝 [WhatsApp] Enviando plantilla personalizada ${templateName} a ${toE164}`);
    this.logger.debug(`📝 [WhatsApp] Parámetros: ${JSON.stringify(parameters, null, 2)}`);
    
    // Verificar opt-in
    const hasOptIn = await this.checkOptIn(companyId, toE164);
    if (!hasOptIn) {
      this.logger.warn(`⚠️ [WhatsApp] Usuario ${toE164} no tiene opt-in para WhatsApp`);
      return {
        success: false,
        reason: 'No opt-in',
      };
    }

    return this.sendTemplate({
      toE164,
      templateName,
      languageCode: this.langCode,
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters.map(text => ({ type: 'text', text })),
        },
      ] : undefined,
    });
  }

  /**
   * Registra opt-in de WhatsApp para un paciente
   */
  async registerOptIn(companyId: string, phoneE164: string, patientId?: string): Promise<void> {
    this.logger.debug(`✅ [WhatsApp] Registrando opt-in para ${phoneE164} (companyId: ${companyId}, patientId: ${patientId})`);
    
    const normalizedPhone = this.e164Service.normalize(phoneE164);
    this.logger.debug(`✅ [WhatsApp] Teléfono normalizado: ${normalizedPhone}`);

    const existingLink = await this.patientLinkRepo.findOne({
      where: { companyId, phoneE164: normalizedPhone },
    });

    if (existingLink) {
      this.logger.debug(`✅ [WhatsApp] Actualizando opt-in existente para ${normalizedPhone}`);
      await this.patientLinkRepo.update(existingLink.id, {
        optInWhatsapp: true,
        optInDate: new Date(),
      });
    } else if (patientId) {
      this.logger.debug(`✅ [WhatsApp] Creando nuevo registro de opt-in para ${normalizedPhone}`);
      await this.patientLinkRepo.save({
        companyId,
        phoneE164: normalizedPhone,
        medilinkPatientId: patientId,
        optInWhatsapp: true,
        optInDate: new Date(),
      });
    } else {
      this.logger.warn(`⚠️ [WhatsApp] No se pudo registrar opt-in: no existe link y no se proporcionó patientId`);
    }

    this.logger.debug(`✅ [WhatsApp] Opt-in registrado para ${normalizedPhone}`);
  }

  /**
   * Registra opt-out de WhatsApp para un paciente
   */
  async registerOptOut(companyId: string, phoneE164: string): Promise<void> {
    this.logger.debug(`❌ [WhatsApp] Registrando opt-out para ${phoneE164} (companyId: ${companyId})`);
    
    const normalizedPhone = this.e164Service.normalize(phoneE164);
    this.logger.debug(`❌ [WhatsApp] Teléfono normalizado: ${normalizedPhone}`);

    await this.patientLinkRepo.update(
      { companyId, phoneE164: normalizedPhone },
      { optInWhatsapp: false },
    );

    this.logger.debug(`❌ [WhatsApp] Opt-out registrado para ${normalizedPhone}`);
  }
}
