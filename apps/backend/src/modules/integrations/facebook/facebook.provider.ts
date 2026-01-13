// integrations/facebook/facebook.provider.ts
import axios from 'axios';

export async function subscribePage(pageId: string, pageAccessToken: string) {
  await axios.post(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, null, {
    params: {
      access_token: pageAccessToken,
      subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
    }
  });
}

export async function sendText(pageAccessToken: string, psid: string, text: string) {
  await axios.post('https://graph.facebook.com/v19.0/me/messages', {
    recipient: { id: psid },
    message: { text },
    messaging_type: 'RESPONSE'
  }, { params: { access_token: pageAccessToken } });
}
