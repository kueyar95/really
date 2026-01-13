import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { AiBotsService } from './ai-bots.service';
import { CreateAiBotDto } from './dto/create-ai-bot.dto';
// import { UpdateAiBotDto } from './dto/update-ai-bot.dto';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
// import { AddFunctionsDto } from './dto/add-functions.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TryChatDto } from './dto/try-chat.dto';
import { OpenAIService } from '../ai/services/openai.service';
import { HttpCode } from '@nestjs/common';
@Controller('ai-bots')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AiBotsController {
  constructor(
    private readonly aiBotsService: AiBotsService,
    private readonly openAIService: OpenAIService
  ) {}

  @Post()
  create(@Body() createAiBotDto: CreateAiBotDto, @CurrentUser() user: User) {
    createAiBotDto.companyId = user.companyId;
    return this.aiBotsService.create(createAiBotDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.aiBotsService.findByCompany(user.companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const bot = await this.aiBotsService.findOne(id);
    if (bot.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este bot');
    }
    return bot;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateAiBotDto,
    @CurrentUser() user: User
  ) {
    const bot = await this.aiBotsService.findOne(id);
    if (bot.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este bot');
    }
    return this.aiBotsService.update(id, updateAiBotDto); 
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const bot = await this.aiBotsService.findOne(id);
    if (bot.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este bot');
    }
    return this.aiBotsService.remove(id);
  }

  @Post(':id/functions')
  async addFunctions(
    @Param('id') botId: string,
    @Body() { functionIds },
    @CurrentUser() user: User
  ) {
    const bot = await this.aiBotsService.findOne(botId);
    if (bot.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este bot');
    }
    return this.aiBotsService.addFunctions(botId, functionIds);
  }

  @Patch(':id/steps')
  async updateSteps(
    @Param('id') id: string,
    @Body() { steps }, // sin dto son los steps
    @CurrentUser() user: User
  ) {
    const bot = await this.aiBotsService.findOne(id);
    if (bot.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este bot');
    }
    return this.aiBotsService.updateSteps(bot, steps);
  }

  @Post('try-chat')
  @HttpCode(200)
  async tryChat(@Body() tryChatDto: TryChatDto) {
    const { message, chatHistory, systemPrompt, botConfig } = tryChatDto;

    // Call the OpenAI service with the new tryChat method
    const response = await this.openAIService.tryChat(
      message,
      chatHistory,
      systemPrompt,
      botConfig
    );

    return {
      content: response.content,
      tool_calls: response.tool_calls
    };
  }
}
