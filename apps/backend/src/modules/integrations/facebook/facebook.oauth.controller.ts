// integrations/facebook/facebook.oauth.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import axios from 'axios';

const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.FB_REDIRECT_URI!;

@Controller('integrations/facebook')
export class FacebookOAuthController {
  @Get('login')
  async login(@Res() res) {
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', APP_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('scope', [
      'pages_show_list','pages_manage_metadata','pages_messaging',
      'instagram_basic','instagram_manage_messages'
    ].join(','));
    return res.redirect(url.toString());
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    const token = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code }
    });
    const userAccessToken = token.data.access_token;

    const pages = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: userAccessToken }
    });
    // TODO: devolver páginas para que el usuario elija y persistir page_access_token
    return { pages: pages.data.data };
  }
}
