// apps/backend/src/integrations/whatsapp/embedded-signup.callback.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('/integrations/whatsapp/embedded-signup')
export class EmbeddedSignupCallbackController {
  @Get('/callback')
  async callback(
    @Query() query: any,
    @Res() res: Response
  ) {
    // ====== LOGS DE SERVIDOR ======
    console.log('[WA-ES][callback] Query recibido:', query);

    // ----- Entradas básicas -----
    const { code, state, error, error_description } = query ?? {};
    const appId        = process.env.FB_APP_ID!;
    const appSecret    = process.env.FB_APP_SECRET!;
    const businessId   = process.env.FB_BUSINESS_ID; // opcional
    const frontOrigin  = process.env.FRONTEND_ORIGIN || process.env.AUTH_FRONT_URL || 'http://localhost:5173';

    // redirect_uri EXACTAMENTE igual al registrado en “URI de redireccionamiento válidos”
    const redirectUri  =
      process.env.WHATSAPP_EMBEDDED_REDIRECT_URI ||
      `${process.env.PUBLIC_BASE_URL}/integrations/whatsapp/embedded-signup/callback`;

    // origin del backend para permitir también postMessage hacia la base del API
    const apiOrigin = (redirectUri.split('/integrations/')[0]) || frontOrigin;

    // Objeto que enviaremos por postMessage (no pongas el token acá):
    const pmPayload: any = {
      type: 'wa:embedded:completed',
      ok: !!code && !error,
      code: code || null,
      state: state || null,
      error: error || null,
      error_description: error_description || null,
      ts: Date.now(),
    };

    // Datos de depuración que mostraremos en HTML (token oculto/mask)
    const debugData: any = {
      received: { code, state, error, error_description },
      redirectUri,
      frontOrigin,
      apiOrigin,
      graphCalls: [] as Array<{ step: string; ok: boolean; detail?: any }>,
    };

    let accessToken: string | null = null;
    let assignedWabaId: string | null = null;

    try {
      // =========== 1) Intercambio de CODE -> ACCESS TOKEN ===========
      if (!code || error) {
        throw new Error(`No llegó 'code' válido. error=${error || 'none'}`);
      }

      const tokenRes = await axios.get(
        'https://graph.facebook.com/v21.0/oauth/access_token',
        {
          params: {
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code,
          },
        }
      );

      accessToken = tokenRes.data?.access_token;
      if (!accessToken) {
        throw new Error('Graph no devolvió access_token');
      }

      debugData.graphCalls.push({ step: 'oauth/access_token', ok: true });

      // =========== 2) (Opcional) Listar WABAs compartidas ===========
      if (businessId) {
        try {
          const shared = await axios.get(
            `https://graph.facebook.com/v21.0/${businessId}/client_whatsapp_business_accounts`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          assignedWabaId = shared.data?.data?.[0]?.id || null;
          debugData.graphCalls.push({
            step: 'GET client_whatsapp_business_accounts',
            ok: true,
            detail: { firstWaba: assignedWabaId },
          });
        } catch (e: any) {
          debugData.graphCalls.push({
            step: 'GET client_whatsapp_business_accounts',
            ok: false,
            detail: e?.response?.data || e?.message || e,
          });
        }
      }

      // =========== 3) (Opcional) Subscribirse a webhooks del WABA ===========
      if (assignedWabaId) {
        try {
          await axios.post(
            `https://graph.facebook.com/v21.0/${assignedWabaId}/subscribed_apps`,
            null,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          debugData.graphCalls.push({ step: 'POST subscribed_apps', ok: true });
        } catch (e: any) {
          debugData.graphCalls.push({
            step: 'POST subscribed_apps',
            ok: false,
            detail: e?.response?.data || e?.message || e,
          });
        }
      }

      // En este punto podrías:
      // - persistir accessToken (en backend seguro)
      // - persistir assignedWabaId, phone_number_id si lo tienes
      // - asociarlo a companyId (parsea 'state') y marcar canal “conectado”
      //   NO lo devuelvas al front.

    } catch (e: any) {
      // No abortamos el flujo visual: igual devolvemos la página con debug y pmPayload
      pmPayload.ok = false;
      pmPayload.error = pmPayload.error || 'callback_failed';
      pmPayload.error_description = pmPayload.error_description || (e?.response?.data || e?.message || 'unknown_error');

      debugData.graphCalls.push({
        step: 'EXCEPTION',
        ok: false,
        detail: e?.response?.data || e?.message || e
      });

      console.error('[WA-ES][callback] error:', e?.response?.data || e?.message || e);
    }

    // ====== HTML de depuración + postMessage ======
    // Jamás muestres el token completo en HTML. Si necesitas verlo, míralo en logs del server.
    const maskedToken = accessToken ? `${accessToken.slice(0, 8)}…${accessToken.slice(-6)}` : null;

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>WA Embedded Callback</title></head>
<body style="font-family:ui-sans-serif,system-ui;margin:24px">
  <h2>WhatsApp Embedded Signup – Callback</h2>
  <p><strong>Status:</strong> ${pmPayload.ok ? 'OK' : 'ERROR'}</p>
  <p><strong>WABA asignado:</strong> ${assignedWabaId || 'N/A'}</p>
  <p><strong>Access Token (mask):</strong> ${maskedToken || 'N/A'}</p>

  <h3>Debug</h3>
  <pre id="debug" style="padding:12px;background:#111;color:#0f0;white-space:pre-wrap;border-radius:8px;"></pre>

  <script>
    (function () {
      const data = ${JSON.stringify(pmPayload)};
      const front = ${JSON.stringify(frontOrigin)};
      const api   = ${JSON.stringify(apiOrigin)};
      const debug = ${JSON.stringify(debugData, null, 2)};

      function log(){ try{ console.log('[WA-ES][callback]', ...arguments); }catch(_){} }

      document.getElementById('debug').textContent =
        JSON.stringify({ payload: data, debug }, null, 2);

      try {
        if (window.opener && !window.opener.closed) {
          log('postMessage -> opener', data, 'to', front, 'and', api);
          window.opener.postMessage(data, front);
          window.opener.postMessage(data, api);
        }
        try {
          log('postMessage -> parent', data, 'to', front, 'and', api);
          window.parent.postMessage(data, front);
          window.parent.postMessage(data, api);
        } catch(e){ log('parent.postMessage failed', e); }
      } catch(e){ log('postMessage error', e); }

      setTimeout(function(){ try{ window.close(); }catch(_){} }, 2500);
    })();
  </script>
</body>
</html>`;

    res.status(200).send(html);
  }
}
