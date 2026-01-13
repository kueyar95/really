import { User } from '@supabase/supabase-js';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedUser extends User {
  company_id: string;
  username: string;
  role: string;
  normalized_id: string;
  company: Company;
}

export interface NormalizedUser {
  id: string;
  company_id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  supabase_id: string;
  company: Company;
}