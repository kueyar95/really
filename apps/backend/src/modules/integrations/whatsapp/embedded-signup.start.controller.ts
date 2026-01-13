// src/modules/integrations/whatsapp/embedded-signup.start.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('integrations/whatsapp/embedded-signup')
export class EmbeddedSignupStartController {
  @Get('start')
  start(@Query('companyId') companyId: string, @Res() res: Response) {
    const appId = process.env.FACEBOOK_APP_ID!; // <- el de ESTA app
    const redirectUri = process.env.WHATSAPP_EMBEDDED_REDIRECT_URI!; // https público registrado
  
    const u = new URL('https://www.facebook.com/dialog/whatsapp_business_setup');
    u.searchParams.set('app_id', appId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('state', JSON.stringify({ companyId }));
  
    // Log para auditar que no salga "localhost" ni app_id equivocado
    console.log('[WA:ES] redirect ->', u.toString());
    return res.redirect(u.toString());
  }
}