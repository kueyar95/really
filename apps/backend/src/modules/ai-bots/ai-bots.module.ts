import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiBotsService } from './ai-bots.service';
import { AiBotsController } from './ai-bots.controller';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AiBot } from './entities/ai-bot.entity';
import { BotFunction } from './entities/bot-function.entity';
import { BotFunctionsService } from './services/bot-functions.service';
import { Function } from '../functions/entities/function.entity';
import { Company } from '../companies/entities/company.entity';
import { FunctionsModule } from '../functions/functions.module';
import { OpenAIModule } from '../ai/open-ai.module';
import { OpenAIService } from '../ai/services/openai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiBot,
      BotFunction,
      Function,
      Company, 
    ]),
    AuthModule,
    UsersModule,
    FunctionsModule,
    OpenAIModule
  ],
  controllers: [AiBotsController],
  providers: [AiBotsService, BotFunctionsService, OpenAIService],
  exports: [AiBotsService, BotFunctionsService, OpenAIService]
})
export class AiBotsModule {}
