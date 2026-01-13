import { Controller, Get, Post, Body, Put, Patch, Param, Delete, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funnel } from '../funnels/entities/funnel.entity';
import { UpdateStageNotificationEmailsDto } from './dto/update-stage-notification-emails.dto';

@Controller('stages')
@UseGuards(SupabaseAuthGuard)
export class StagesController {
  constructor(
    private readonly stagesService: StagesService,
    @InjectRepository(Funnel)
    private readonly funnelRepository: Repository<Funnel>
  ) {}

  // Método auxiliar para verificar acceso al funnel
  private async verifyFunnelAccess(funnelId: string, userId: string, companyId: string): Promise<void> {
    const funnel = await this.funnelRepository.findOne({
      where: { id: funnelId }
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID ${funnelId} not found`);
    }

    if (funnel.companyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a este funnel');
    }
  }

  @Post()
  async create(@Body() createStageDto: CreateStageDto, @CurrentUser() user: User) {
    // Verificar que el usuario tenga acceso al funnel
    await this.verifyFunnelAccess(createStageDto.funnelId, user.id, user.companyId);
    return this.stagesService.create(createStageDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    if (user.role !== Role.SUPER_ADMIN) {
      // Si no es SUPER_ADMIN, solo puede ver los stages de su compañía
      return this.stagesService.findByCompany(user.companyId);
    }
    // Si es SUPER_ADMIN, puede ver todos los stages
    return this.stagesService.findAll();
  }

  @Get('funnel/:funnelId')
  async findByFunnel(@Param('funnelId') funnelId: string, @CurrentUser() user: User) {
    // Verificar que el usuario tenga acceso al funnel
    await this.verifyFunnelAccess(funnelId, user.id, user.companyId);
    return this.stagesService.findByFunnel(funnelId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const stage = await this.stagesService.findOne(id);
    
    // Verificar que el usuario tenga acceso al funnel al que pertenece el stage
    await this.verifyFunnelAccess(stage.funnelId, user.id, user.companyId);
    
    return stage;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto, @CurrentUser() user: User) {
    const stage = await this.stagesService.findOne(id);
    
    // Verificar que el usuario tenga acceso al funnel al que pertenece el stage
    await this.verifyFunnelAccess(stage.funnelId, user.id, user.companyId);
    
    return this.stagesService.update(id, updateStageDto);
  }

  @Put(':id/notification-emails')
  @Roles(Role.ADMIN) // Solo los admins pueden modificar las notificaciones por ahora
  async updateNotificationEmails(
    @Param('id') id: string,
    @Body() updateEmailsDto: UpdateStageNotificationEmailsDto,
    @CurrentUser() user: User,
  ) {
    const stage = await this.stagesService.findOne(id);
    // Verificar que el usuario tenga acceso al funnel al que pertenece el stage
    await this.verifyFunnelAccess(stage.funnelId, user.id, user.companyId);

    // El DTO asegura que notificationEmails es un array de emails si se proporciona.
    // Si no se proporciona (undefined por @IsOptional), pasamos un array vacío para limpiar.
    return this.stagesService.updateNotificationEmails(id, updateEmailsDto.notificationEmails ?? []);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const stage = await this.stagesService.findOne(id);
    
    // Verificar que el usuario tenga acceso al funnel al que pertenece el stage
    await this.verifyFunnelAccess(stage.funnelId, user.id, user.companyId);
    
    return this.stagesService.remove(id);
  }

  @Put('funnel/:funnelId/reorder')
  async reorderStages(
    @Param('funnelId') funnelId: string,
    @Body() body: { stageIds: number[] },
    @CurrentUser() user: User
  ) {
    // Verificar que el usuario tenga acceso al funnel
    await this.verifyFunnelAccess(funnelId, user.id, user.companyId);
    
    return this.stagesService.reorderStages(funnelId, body.stageIds);
  }

  @Get(':id/clients')
  async findClientsForStage(@Param('id') id: string, @CurrentUser() user: User) {
    const stage = await this.stagesService.findOne(id);
    
    // Verificar que el usuario tenga acceso al funnel al que pertenece el stage
    await this.verifyFunnelAccess(stage.funnelId, user.id, user.companyId);
    
    return this.stagesService.findClientsForStage(id);
  }
}
