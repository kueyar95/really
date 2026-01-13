import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { WhatsappCredentials } from './entities/wa-credentials.entity';
import { WhatsappCredentialsService } from './whatsapp-credentials.service';

import { EmbeddedSignupExchangeController } from './embedded-signup.exchange.controller';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import { EmbeddedSignupStartController } from './embedded-signup.start.controller';
import { EmbeddedSignupCallbackController } from './embedded-signup.callback.controller';

import { ChannelsModule } from '../../channels/channels.module'; // ⬅️ importar el módulo que exporta ChannelsService

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappCredentials]),
    HttpModule,
    forwardRef(() => ChannelsModule), // ⬅️ clave para DI; usa forwardRef si temes circularidad
  ],
  controllers: [
    EmbeddedSignupExchangeController,
    WhatsAppWebhookController,
    EmbeddedSignupStartController,
    EmbeddedSignupCallbackController,
  ],
  providers: [
    WhatsappCredentialsService,
  ],
  exports: [
    WhatsappCredentialsService,
  ],
})
export class WhatsAppModule {}
