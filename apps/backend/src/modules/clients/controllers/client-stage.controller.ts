import { Controller, Get, Post, Body, Put, Param, Query, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ClientStageService } from '../services/client-stage.service';
import { CreateClientStageDto } from '../dtos/client-stage.dto';
import { ClientStage } from '../entities/client-stage.entity';
import { SupabaseAuthGuard } from '../../../auth/guards/auth.guard';

@Controller('client-stages')
@UseGuards(SupabaseAuthGuard)
export class ClientStageController {
  constructor(private readonly clientStageService: ClientStageService) {}

  @Post()
  async create(@Body() createClientStageDto: CreateClientStageDto): Promise<ClientStage> {
    return await this.clientStageService.create(createClientStageDto);
  }

  @Get('client/:clientId')
  async findByClientId(@Param('clientId') clientId: string): Promise<ClientStage[]> {
    return await this.clientStageService.findByClientId(clientId);
  }

  @Get('client/:clientId/funnel/:funnelId')
  async findByClientAndFunnel(
    @Param('clientId') clientId: string,
    @Param('funnelId') funnelId: string,
    @Query('channelId') channelId?: string,
  ): Promise<ClientStage | null> {
    return await this.clientStageService.findByClientAndFunnel(clientId, funnelId, { channelId });
  }

  // @Get(':id/chat-history')
  // async getChatHistory(@Param('id') id: string) {
  //   return await this.clientStageService.getChatHistory(id);
  // }

  @Put(':id/assign-user/:userId')
  async assignUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<ClientStage> {
    return await this.clientStageService.assignUser(id, userId);
  }

  @Put(':id/remove-user')
  async removeUser(@Param('id') id: string): Promise<ClientStage> {
    console.log('DEBUG id:', id);
    console.log('DEBUG typeof id:', typeof id);
    return await this.clientStageService.removeAssignedUserFromStage(id);
  }

  // ✅ Nuevo endpoint sin ambigüedad de tipos
  @Put('client/:clientId/funnel/:funnelId/remove-user')
  async removeUserByPair(
    @Param('clientId') clientId: string,
    @Param('funnelId') funnelId: string,
  ) {
    const cs = await this.clientStageService.findByClientAndFunnel(clientId, funnelId, { ensure: true });
    if (!cs?.id) throw new BadRequestException('ClientStage no encontrado');
    return this.clientStageService.removeAssignedUserFromStage(cs.id); // sea int o uuid, lo maneja el service
  }

  @Put('client/:clientId/change-stage/:stageId')
  async changeStage(
    @Param('clientId') clientId: string,
    @Param('stageId') stageId: string,
    @Query('channelId') channelId?: string,
  ): Promise<ClientStage> {
    return await this.clientStageService.changeStage(clientId, stageId, channelId);
  }
}