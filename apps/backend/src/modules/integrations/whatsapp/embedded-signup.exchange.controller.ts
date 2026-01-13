// apps/backend/src/modules/integrations/whatsapp/embedded-signup.exchange.controller.ts
import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { WhatsappCredentialsService } from './whatsapp-credentials.service';
import { ChannelsService } from '@/modules/channels/channels.service';
import { ChannelStatus } from '@/modules/channels/core/types/channel.types';

// ⚠️ Solo esto queda top-level (no depende de env runtime)
const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v21.0';
const graph = axios.create({
  baseURL: `https://graph.facebook.com/${GRAPH_VERSION}`,
  timeout: 15_000,
});

// ——— Helpers ———
function maskToken(t?: string | null) {
  if (!t) return null;
  return t.slice(0, 8) + '…' + ` (${t.length} chars)`;
}
function pickHeader(h: any, k: string) {
  const v = h?.[k.toLowerCase()];
  return typeof v === 'string' ? v : undefined;
}

async function gget(
  path: string,
  params: Record<string, any>,
  label: string,
  debugArr: any[],
  debugFlag: boolean,
) {
  try {
    const res = await graph.get(path, { params });
    debugArr.push({
      step: label,
      ok: true,
      status: res.status,
      headers: {
        'x-fb-trace-id': pickHeader(res.headers, 'x-fb-trace-id'),
        'x-fb-rev': pickHeader(res.headers, 'x-fb-rev'),
        'x-app-usage': pickHeader(res.headers, 'x-app-usage'),
        'x-business-use-case-usage': pickHeader(res.headers, 'x-business-use-case-usage'),
      },
      data: debugFlag ? res.data : undefined,
    });
    return res.data;
  } catch (e) {
    const err = e as AxiosError<any>;
    const data = err.response?.data;
    debugArr.push({
      step: label,
      ok: false,
      status: err.response?.status || 0,
      error: data || err.message,
    });
    throw err;
  }
}

// Registrar/activar el número para Cloud API
async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  debugArr: any[],
  debugFlag: boolean,
) {
  const PIN = process.env.WA_TWO_STEP_PIN; // opcional
  const pinToUse =
    PIN && /^\d{6}$/.test(PIN)
      ? PIN
      : Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const res = await graph.post(
      `/${phoneNumberId}/register`,
      {},
      { params: { access_token: accessToken, messaging_product: 'whatsapp', pin: pinToUse } },
    );
    debugArr.push({
      step: `${phoneNumberId}/register`,
      ok: true,
      status: res.status,
      data: debugFlag ? res.data : undefined,
    });
    console.log('[WA-ES] ✅ Número registrado/activado en Cloud API');
    return true;
  } catch (e: any) {
    debugArr.push({
      step: `${phoneNumberId}/register`,
      ok: false,
      status: e.response?.status || 0,
      error: e.response?.data || e.message,
    });
    console.warn('[WA-ES] ⚠️ Falló el registro del número:', e.response?.data || e.message);
    return false;
  }
}

@Controller('/integrations/whatsapp/embedded-signup')
export class EmbeddedSignupExchangeController {
  constructor(
    private readonly whatsappCreds: WhatsappCredentialsService,
    private readonly channelsService: ChannelsService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('/exchange-fblogin')
  async exchangeFBLogin(@Body() body: {
    code: string;
    companyId: string;
    grantedScopes?: string;
    configId?: string;
  }) {
    const { code, companyId, grantedScopes, configId } = body || {};
    const debug: any = { input: { companyId, configId, grantedScopes }, steps: [] };

    if (!code) {
      throw new HttpException({ success: false, error: 'missing_code' }, HttpStatus.BAD_REQUEST);
    }
    if (!companyId) {
      throw new HttpException({ success: false, error: 'missing_companyId' }, HttpStatus.BAD_REQUEST);
    }

    // ✅ Lee env en runtime (desde ConfigService y fallback a process.env)
    const APP_ID = this.cfg.get<string>('FACEBOOK_APP_ID') ?? process.env.FACEBOOK_APP_ID;
    const APP_SECRET = this.cfg.get<string>('FACEBOOK_APP_SECRET') ?? process.env.FACEBOOK_APP_SECRET;
    const WA_ES_DEBUG = ((this.cfg.get<string>('WA_ES_DEBUG') ?? process.env.WA_ES_DEBUG) === '1');

    console.log('[ENV] CWD:', process.cwd());
    console.log('[ENV] APP_ID set?', !!APP_ID);
    console.log('[ENV] APP_SECRET set?', !!APP_SECRET);

    if (!APP_ID || !APP_SECRET) {
      throw new HttpException(
        'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET no están configurados.',
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log('[WA-ES][exchange-fblogin] 🚀 Processing FB.login code:', {
      codePrefix: code.slice(0, 10) + '...',
      companyId,
      configId,
      grantedScopes,
      ts: new Date().toISOString(),
    });

    try {
      // 1) CODE → ACCESS TOKEN (sin redirect_uri en FB.login)
      const tokenData = await gget(
        '/oauth/access_token',
        { client_id: APP_ID, client_secret: APP_SECRET, code },
        'oauth/access_token',
        debug.steps,
        WA_ES_DEBUG,
      );

      const accessToken: string | undefined = tokenData?.access_token;
      if (!accessToken) {
        throw new HttpException(
          { success: false, error: 'no_access_token', detail: tokenData },
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('[WA-ES][exchange-fblogin] ✅ Token obtained', { accessTokenMasked: maskToken(accessToken) });

      // 2) (Opcional) debug del token
      let debugToken: any = null;
      try {
        const appToken = `${APP_ID}|${APP_SECRET}`;
        debugToken = await gget(
          '/debug_token',
          { input_token: accessToken, access_token: appToken },
          'debug_token',
          debug.steps,
          WA_ES_DEBUG,
        );
      } catch {
        console.warn('[WA-ES] debug_token failed (non-blocking)');
      }

      // 3) Info básica del user
      const me = await gget(
        '/me',
        { access_token: accessToken, fields: 'id,name' },
        'me',
        debug.steps,
        WA_ES_DEBUG,
      );

      // 4) WABAs asignados al usuario
      const assigned = await gget(
        `/${me.id}/assigned_whatsapp_business_accounts`,
        { access_token: accessToken, fields: 'id,name' },
        'user/assigned_whatsapp_business_accounts',
        debug.steps,
        WA_ES_DEBUG,
      );
      let wabaIds: string[] = (assigned?.data || []).map((x: any) => x.id);

      // 5) Fallback via negocios → owned_whatsapp_business_accounts
      let businessName: string | null = null;
      if (wabaIds.length === 0) {
        const businesses = await gget(
          '/me/businesses',
          { access_token: accessToken, fields: 'id,name' },
          'me/businesses',
          debug.steps,
          WA_ES_DEBUG,
        );
        for (const b of (businesses?.data || [])) {
          if (!businessName && b?.name) businessName = b.name;
          const owned = await gget(
            `/${b.id}/owned_whatsapp_business_accounts`,
            { access_token: accessToken, fields: 'id,name' },
            `${b.id}/owned_whatsapp_business_accounts`,
            debug.steps,
            WA_ES_DEBUG,
          );
          for (const w of (owned?.data || [])) {
            if (w?.id) wabaIds.push(w.id);
          }
        }
        wabaIds = [...new Set(wabaIds)];
      }

      // 6) Buscar teléfonos por WABA
      let pick:
        | {
            wabaId: string;
            phoneNumberId: string;
            displayPhoneNumber?: string;
            verifiedName?: string;
          }
        | null = null;

      for (const wabaId of wabaIds) {
        const phones = await gget(
          `/${wabaId}/phone_numbers`,
          {
            access_token: accessToken,
            fields: 'id,display_phone_number,verified_name,code_verification_status',
          },
          `${wabaId}/phone_numbers`,
          debug.steps,
          WA_ES_DEBUG,
        );
        const p = phones?.data?.[0];
        if (p?.id) {
          pick = {
            wabaId,
            phoneNumberId: p.id,
            displayPhoneNumber: p.display_phone_number,
            verifiedName: p.verified_name,
          };
          break;
        }
      }

      // 7) Si hay phoneNumberId, (opcional) OTP + registrar (activar)
      if (pick?.phoneNumberId) {
        try {
          const info = await gget(
            `/${pick.phoneNumberId}`,
            { access_token: accessToken, fields: 'display_phone_number,code_verification_status' },
            `${pick.phoneNumberId} [check code_verification_status]`,
            debug.steps,
            WA_ES_DEBUG,
          );

          if (info?.code_verification_status !== 'VERIFIED') {
            console.warn('[WA-ES] OTP no verificado. Enviando request_code (no bloqueante)…');
            try {
              const resReq = await graph.post(
                `/${pick.phoneNumberId}/request_code`,
                {},
                {
                  params: {
                    access_token: accessToken,
                    code_verification_method: 'SMS',
                  },
                },
              );
              debug.steps.push({
                step: `${pick.phoneNumberId}/request_code`,
                ok: true, status: resReq.status,
                data: WA_ES_DEBUG ? resReq.data : undefined,
              });
            } catch (e: any) {
              debug.steps.push({
                step: `${pick.phoneNumberId}/request_code`,
                ok: false, status: e.response?.status || 0,
                error: e.response?.data || e.message,
              });
              console.warn('[WA-ES] request_code falló (no bloqueante):', e.response?.data || e.message);
            }
          }
        } catch {
          // ya trazado por gget
        }

        await registerPhoneNumber(pick.phoneNumberId, accessToken, debug.steps, WA_ES_DEBUG);
      }

      // 8) Webhooks (no bloqueante)
      if (pick?.wabaId) {
        try {
          const res = await graph.post(
            `/${pick.wabaId}/subscribed_apps`,
            {},
            { params: { access_token: accessToken } },
          );
          debug.steps.push({
            step: `${pick.wabaId}/subscribed_apps`,
            ok: true,
            status: res.status,
            headers: {
              'x-fb-trace-id': pickHeader(res.headers, 'x-fb-trace-id'),
              'x-fb-rev': pickHeader(res.headers, 'x-fb-rev'),
            },
            data: WA_ES_DEBUG ? res.data : undefined,
          });
          console.log('[WA-ES] ✅ Webhooks subscribed for WABA', pick.wabaId);
        } catch (e) {
          const err = e as AxiosError<any>;
          debug.steps.push({
            step: `${pick?.wabaId}/subscribed_apps`,
            ok: false,
            status: err.response?.status || 0,
            error: err.response?.data || err.message,
          });
          console.warn('[WA-ES] subscribed_apps failed:', err.response?.data || err.message);
        }
      }

      // 9) Persistencia mínima
      try {
        await this.whatsappCreds.createOrUpdateByCompany({
          companyId,
          accessToken,
          wabaId: pick?.wabaId ?? null,
          phoneNumberId: pick?.phoneNumberId ?? null,
          status: pick?.phoneNumberId ? 'connected' : 'partial',
        });
      } catch (e) {
        console.warn('[WA-ES] ⚠️ Persist credentials failed:', e);
      }

      // 10) Canal interno
      try {
        await this.channelsService.upsertWhatsAppCloudChannel({
          companyId,
          accessToken,
          wabaId: pick?.wabaId ?? null,
          phoneNumberId: pick?.phoneNumberId ?? null,
          phoneNumber: pick?.displayPhoneNumber ?? null,
          businessName: businessName ?? null,
          configId: configId ?? null,
          status: pick?.phoneNumberId ? ChannelStatus.ACTIVE : ChannelStatus.INACTIVE,
        });
      } catch (e) {
        console.warn('[WA-ES] ⚠️ Upsert channel failed:', e);
      }

      // 11) Respuesta
      const success = !!pick?.phoneNumberId;
      const resp: any = {
        success,
        wabaId: pick?.wabaId || null,
        phoneNumberId: pick?.phoneNumberId || null,
        phoneNumber: pick?.displayPhoneNumber || null,
        verifiedName: pick?.verifiedName || null,
        accessTokenMasked: maskToken(accessToken),
        message: success
          ? `WhatsApp conectado: ${pick?.displayPhoneNumber}`
          : 'WhatsApp Cloud API conectada, pero no se encontró número asociado',
      };

      if (!success) {
        resp.error = 'no_phone_numbers_found';
        resp.debug = {
          note: 'Activa WA_ES_DEBUG=1 para ver payloads completos de Graph.',
          causes: [
            'No hay número de WhatsApp Business conectado a ese WABA.',
            'El usuario no es admin/propietario del WABA con el número.',
            'Faltan permisos: whatsapp_business_management / business_management / whatsapp_business_messaging.',
            'El alta no completó el claim del número.',
          ],
          steps: debug.steps,
          me,
          debugToken,
          grantedScopes,
        };
      } else if (WA_ES_DEBUG) {
        resp.debug = { steps: debug.steps, me, debugToken, grantedScopes };
      }

      console.log('[WA-ES][exchange-fblogin] ✅ Success:', {
        ...resp,
        accessTokenMasked: maskToken(accessToken),
      });
      return resp;
    } catch (error: any) {
      const graphError = error?.response?.data?.error || error?.response?.data;
      console.error('[WA-ES][exchange-fblogin] ❌ Error:', {
        status: error?.response?.status,
        error: graphError || error?.message,
      });

      const payload: any = {
        success: false,
        error: 'exchange_failed',
        message: graphError?.message || error?.message || 'Error al conectar WhatsApp',
      };

      if (graphError?.code === 100 && graphError?.error_subcode === 36008) {
        payload.message = 'El código de autorización no es válido o expiró.';
        payload.debug = {
          causes: ['APP_ID/APP_SECRET no coinciden con el frontend', 'El code ya fue usado o caducó'],
          solution: 'Vuelve a iniciar el proceso de conexión',
        };
      } else if (graphError?.code === 190) {
        payload.message = 'El código de autorización expiró';
        payload.debug = { solution: 'Intenta conectar nuevamente' };
      } else if (graphError?.code === 10) {
        payload.message = 'Permisos insuficientes en la app';
        payload.debug = { solution: 'Verifica permisos de WhatsApp Business y Business Management en la app' };
      }

      // En modo debug, anexa trazas
      payload.details = graphError || error?.message;
      payload.steps = debug.steps;

      throw new HttpException(payload, error?.response?.status || HttpStatus.BAD_REQUEST);
    }
  }
}
