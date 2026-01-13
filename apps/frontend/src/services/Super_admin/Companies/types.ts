import { Channel, Funnel } from '@/services/Funnels/types';
import { AiBot } from '@/services/Stages/types';
import { User } from '@supabase/supabase-js';


export interface Company {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
  channels?: Channel[];
  funnels?: Funnel[];
  aiBots?: AiBot[];
}


export interface CreateCompanyDto {
  name: string;
}

export interface UpdateCompanyDto {
  name?: string;
}
