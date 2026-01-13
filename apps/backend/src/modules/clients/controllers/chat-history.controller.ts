import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ChatHistoryService } from '../services/chat-history.service';
import { CreateChatHistoryDto } from '../dtos/chat-history.dto';
import { ChatHistory } from '../entities/chat-history.entity';
import { SupabaseAuthGuard } from '../../../auth/guards/auth.guard';
import { MultiAgentRequestDto } from '../dtos/multi-agent.dto';

@Controller('chat-history')
@UseGuards(SupabaseAuthGuard)
export class ChatHistoryController {
  private readonly logger = new Logger(ChatHistoryController.name);

  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Post()
  async create(@Body() createChatHistoryDto: CreateChatHistoryDto): Promise<ChatHistory> {
    return await this.chatHistoryService.create(createChatHistoryDto);
  }

  @Get('client/:clientId')
  async findByClientId(
    @Param('clientId') clientId: string,
    @Query('channelId') channelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`GET /chat-history/client/${clientId} - channelId: ${channelId || 'ninguno'}, page: ${page || 'ninguno'}, limit: ${limit || 'ninguno'}`);
    
    // Si viene paginación, usar el método paginado
    if (page || limit) {
      const result = await this.chatHistoryService.findByClientIdPaginated(
        clientId,
        channelId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 50
      );
      this.logger.log(`findByClientIdPaginated: ${result.data.length} mensajes devueltos`);
      return result;
    }

    // Método legacy (con límite de 100)
    const messages = await this.chatHistoryService.findByClientId(clientId, channelId);
    this.logger.log(`findByClientId: ${messages.length} mensajes devueltos`);
    return messages;
  }

  @Get('company/:companyId')
  async findByCompanyId(@Param('companyId') companyId: string) {
    return await this.chatHistoryService.findByCompanyId(companyId);
  }

  @Get('channel/:channelId')
  async findByChannelId(
    @Param('channelId') channelId: string,
    @Query('companyId') companyId?: string
  ) {
    return await this.chatHistoryService.findByChannelId(channelId, companyId);
  }

  @Get('funnel/:funnelId')
  async findByFunnelId(@Param('funnelId') funnelId: string) {
    return await this.chatHistoryService.findByFunnelId(funnelId);
  }
}
