import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FunnelsService } from './services/funnels.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { Role } from '../users/enums/role.enum';
import { Funnel } from './entities/funnel.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('funnels')
@UseGuards(SupabaseAuthGuard)
export class FunnelsController {
  constructor(
    private readonly funnelsService: FunnelsService,
    @InjectRepository(Funnel)
    private readonly funnelRepository: Repository<Funnel>
  ) {}

  @Post()
  create(@Body() createFunnelDto: CreateFunnelDto, @CurrentUser() user: User) {
    // Ensure user can only create funnels for their company
    if (createFunnelDto.companyId !== user.companyId) {
      throw new ForbiddenException('No puedes crear funnels para otra compañía');
    }
    return this.funnelsService.create(createFunnelDto);
  }

  @Get('company')
  async getCompanyFunnels(@CurrentUser() user: User) {
    if (!user?.companyId) {
      throw new ForbiddenException('Usuario no asociado a una compañía');
    }
    return this.funnelsService.findByCompany(user.companyId);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('channelId') channelId?: string,
    @CurrentUser() user?: User
  ) {
    // Si no hay parámetros y el usuario no es SUPER_ADMIN, devolver los funnels de su compañía
    if (!companyId && !channelId && user) {
      return this.funnelsService.findByCompany(user.companyId);
    }

    // Para filtrar por compañía o canal específico, o para obtener todos los funnels,
    // se requiere ser SUPER_ADMIN (esto se verificará con el RolesGuard)
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('No tienes permisos para acceder a estos recursos');
    }

    if (companyId) {
      return this.funnelsService.findByCompany(companyId);
    }
    if (channelId) {
      return this.funnelsService.findByChannel(channelId);
    }
    return this.funnelsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const funnel = await this.funnelsService.findOne(id);
    if (funnel.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este funnel');
    }
    return funnel;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFunnelDto: UpdateFunnelDto,
    @CurrentUser() user: User
  ) {
    const funnel = await this.funnelsService.findOne(id);
    if (funnel.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este funnel');
    }
    return this.funnelsService.update(id, updateFunnelDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const funnel = await this.funnelsService.findOne(id);
    if (funnel.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este funnel');
    }
    return this.funnelsService.remove(id);
  }

  @Get(':id/channels')
  async getFunnelChannels(@Param('id') id: string, @CurrentUser() user: User) {
    const funnel = await this.funnelRepository
      .createQueryBuilder('funnel')
      .leftJoinAndSelect('funnel.funnelChannels', 'funnelChannels')
      .leftJoinAndSelect('funnelChannels.channel', 'channel')
      .where('funnel.id = :id', { id })
      .getOne();

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID ${id} not found`);
    }

    if (funnel.companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a este funnel');
    }

    return funnel.funnelChannels.map(fc => ({
      id: fc.id,
      channelId: fc.channelId,
      channel: fc.channel
    }));
  }

  @Get('company/:companyId/channels-status')
  async getFunnelsWithChannelsStatus(
    @Param('companyId') companyId: string,
    @CurrentUser() user: User
  ) {
    if (companyId !== user.companyId) {
      throw new ForbiddenException('No tienes acceso a los funnels de esta compañía');
    }
    return this.funnelsService.getFunnelsWithChannelsStatus(companyId);
  }
}
