import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

interface EmailParams {
  to: string | string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient;
  private senderEmail: string;
  private awsRegion: string;

  constructor(private readonly configService: ConfigService) {
    this.awsRegion = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.senderEmail = this.configService.get<string>('AWS_SES_SENDER_EMAIL');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    
    if (!this.senderEmail) {
      this.logger.error('AWS_SES_SENDER_EMAIL no está configurado. El servicio de correo no funcionará.');
    }

    const sesClientOptions: any = {
      region: this.awsRegion,
    };

    if (accessKeyId && secretAccessKey) {
      sesClientOptions.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }
    this.sesClient = new SESClient(sesClientOptions);
  }

  async sendEmail({
    to,
    subject,
    bodyText,
    bodyHtml,
  }: EmailParams): Promise<void> {
    if (!this.senderEmail) {
      this.logger.error('Intento de enviar correo pero AWS_SES_SENDER_EMAIL no está configurado.');
      throw new Error('La dirección de correo del remitente no está configurada.');
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    if (toAddresses.length === 0) {
      this.logger.warn('No se proporcionaron destinatarios para el correo.');
      return;
    }

    this.logger.log(`Enviando correo a: ${toAddresses.join(', ')}, Asunto: ${subject}`);

    const params: SendEmailCommandInput = {
      Source: this.senderEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {},
      },
    };

    const messageBody: { Text?: { Data: string; Charset: string; }; Html?: { Data: string; Charset: string; } } = {};

    if (bodyText) {
      messageBody.Text = {
        Data: bodyText,
        Charset: 'UTF-8',
      };
    }

    if (bodyHtml) {
      messageBody.Html = {
        Data: bodyHtml,
        Charset: 'UTF-8',
      };
    }

    if (!bodyText && !bodyHtml) {
      this.logger.error('Se debe proporcionar bodyText o bodyHtml para el correo.');
      throw new Error('El cuerpo del correo no puede estar vacío.');
    }

    params.Message.Body = messageBody;

    try {
      const command = new SendEmailCommand(params);
      const data = await this.sesClient.send(command);
      this.logger.log(`Correo enviado exitosamente a ${toAddresses.join(', ')}. Message ID: ${data.MessageId}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo con AWS SES a ${toAddresses.join(', ')}: ${error.message}`, error.stack);
      throw error;
    }
  }
} 