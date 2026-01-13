import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
  authRedirectUrl: process.env.SUPABASE_AUTH_REDIRECT_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
}));
