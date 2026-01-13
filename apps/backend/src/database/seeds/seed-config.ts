import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Entidades
import { Company } from '../../modules/companies/entities/company.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Channel } from '../../modules/channels/persistence/entities/channel.entity';
import { Funnel } from '../../modules/funnels/entities/funnel.entity';
import { FunnelChannel } from '../../modules/funnels/entities/funnel-channel.entity';
import { Stage } from '../../modules/stages/entities/stage.entity';
import { Client } from '../../modules/clients/entities/client.entity';
import { ClientStage } from '../../modules/clients/entities/client-stage.entity';
import { ChatHistory } from '../../modules/clients/entities/chat-history.entity';
import { AiBot } from '../../modules/ai-bots/entities/ai-bot.entity';
import { BotFunction } from '../../modules/ai-bots/entities/bot-function.entity';
import { Function } from '../../modules/functions/entities/function.entity';
import { Calendar } from '../../modules/calendar/entities/calendar.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [
    Company,
    User,
    Channel,
    Funnel,
    FunnelChannel,
    Stage,
    Client,
    ClientStage,
    ChatHistory,
    AiBot,
    BotFunction,
    Function,
    Calendar
  ],
  synchronize: false,
  logging: true
});

export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
);