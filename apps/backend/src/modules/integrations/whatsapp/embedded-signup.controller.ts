// integrations/whatsapp/embedded-signup.controller.ts
import { Controller, Post, Body } from '@nestjs/common';

@Controller('integrations/whatsapp/embedded-signup')
export class EmbeddedSignupController {
  @Post('callback')
  async onComplete(@Body() payload: any) {
    // 1) Extraer o consultar vía Graph los assets (waba_id, phone_number_id)
    // 2) Persistir credenciales por companyId/tenant
    // 3) Suscribir webhooks de WhatsApp para ese número/WABA (override por tenant si aplica)
    return { ok: true };
  }
}
