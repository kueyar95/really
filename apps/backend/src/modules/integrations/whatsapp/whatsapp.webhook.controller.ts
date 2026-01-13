// whatsapp.webhook.controller.ts
import { ChannelManagerService } from '@/modules/channels/core/services/channel-manager.service';
import { ChannelType } from '@/modules/channels/core/types/channel.types';
import { Controller, Get, Post, Query, Res, Headers, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as crypto from 'crypto';


@Controller('api/whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger('WhatsAppWebhookController');

  constructor(
    private readonly channelManagerService: ChannelManagerService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string, 
    @Query('hub.challenge') challenge: string, 
    @Query('hub.verify_token') token: string, 
    @Res() res
  ) {
    //this.logger.log(`Webhook verification request: mode=${mode}, token=${token}`);
    
    // El token debe coincidir con el configurado en Meta Developers
    if (mode === 'subscribe' && token === 'wacloud_2025_x8K9') {
      //this.logger.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    
    this.logger.error('Webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  @Post()
  async receive(
    @Headers('x-hub-signature-256') sig: string, 
    @Body() payload: any
  ) {
    try {
      // Verificar la firma del webhook
      const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
      
      if (appSecret && sig) {
        const expected = 'sha256=' + crypto
          .createHmac('sha256', appSecret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        if (sig !== expected) {
          this.logger.error('Invalid webhook signature');
          throw new HttpException('Invalid signature', HttpStatus.FORBIDDEN);
        }
      }

      //this.logger.log(`Webhook received: ${JSON.stringify(payload, null, 2)}`);

      // Procesar el webhook usando el ChannelManagerService
      if (payload.object === 'whatsapp_business_account') {
        await this.channelManagerService.handleWebhook(
          ChannelType.WHATSAPP_CLOUD,
          payload
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      // Retornar 200 para evitar reintentos de Meta
      return { success: false, error: error.message };
    }
  }
}