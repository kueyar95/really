import { Role } from '../../modules/users/enums/role.enum';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface CurrentUser extends SupabaseUser {
  role: Role;
  username: string;
  companyId: string;
}