// integrations/facebook/facebook.webhook.controller.ts
import { Controller, Get, Post, Query, Res, Headers, Body, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN!;
const APP_SECRET = process.env.META_APP_SECRET!;

@Controller('webhooks/facebook')
export class FacebookWebhookController {
  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.challenge') challenge: string,
         @Query('hub.verify_token') token: string, @Res() res) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }

  @Post()
  receive(@Headers('x-hub-signature-256') sig: string, @Body() payload: any) {
    const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET)
      .update(JSON.stringify(payload)).digest('hex');
    if (sig !== expected) throw new HttpException('Invalid signature', HttpStatus.FORBIDDEN);

    // payload.entry[].messaging[] -> eventos de Messenger e Instagram
    // TODO: normalizar y publicar a MessageProcessorService
    return { ok: true };
  }
}
