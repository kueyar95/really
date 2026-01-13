import { ChannelConfig } from '../../../core/types/channel.types';

export interface WhatsAppCloudConfig extends ChannelConfig {
  companyId: string;
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  displayPhoneNumber?: string;
}

export interface WhatsAppCloudWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppCloudMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: string;
  text: {
    preview_url: boolean;
    body: string;
  };
}
