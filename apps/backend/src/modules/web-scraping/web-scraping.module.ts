import { Module } from '@nestjs/common';
import { WebScrapingController } from './controllers/web-scraping.controller';
import { WebScrapingService } from './services/web-scraping.service';
import { OpenAIModule } from '../ai/open-ai.module';

@Module({
  imports: [OpenAIModule],
  controllers: [WebScrapingController],
  providers: [WebScrapingService],
  exports: [WebScrapingService],
})
export class WebScrapingModule {} 