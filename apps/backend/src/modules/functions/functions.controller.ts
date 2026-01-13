import { Controller, Post, Body, UseGuards, Get, ForbiddenException, Query, Param, NotFoundException } from '@nestjs/common';
import { FunctionsService } from './functions.service';
import { Function } from './entities/function.entity';
import { CompanyId } from '@/common/decorators/company.decorator';
import { SupabaseAuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreateFunctionDto } from './dto/create-function.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('functions')
@UseGuards(SupabaseAuthGuard)
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  @Post()
  async create(
    @Body() { type, data },
    @CurrentUser() user: User
  ): Promise<Function> {
    return this.functionsService.create(user.companyId, type, data);
  }

  @Get('company')
  async getCompanyFunctions(@CurrentUser() user: User): Promise<Function[]> {
    if (!user?.companyId) {
      throw new ForbiddenException('Usuario no asociado a una compañía');
    }
    return this.functionsService.findByCompany(user.companyId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
    @CurrentUser() user?: User
  ): Promise<Function[]> {
    // Si no hay parámetros pero el usuario no es SUPER_ADMIN, 
    // devolver las funciones de su compañía
    if (!companyId && !type && user && user.role !== Role.SUPER_ADMIN) {
      return this.functionsService.findByCompany(user.companyId);
    }

    // Para filtrar por compañía específica o tipo,
    // se requiere ser SUPER_ADMIN (verificado por RolesGuard)
    if (companyId) {
      return this.functionsService.findByCompany(companyId);
    }

    // Implementar después findByType si es necesario
    // if (type) {
    //   return this.functionsService.findByType(type);
    // }

    // Devolver todas (solo para SUPER_ADMIN)
    return this.functionsService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string, 
    @CurrentUser() user: User
  ): Promise<Function> {
    const function_ = await this.functionsService.findOne(id);
    
    // Verificar que el usuario tenga acceso a esta función
    if (function_.companyId !== user.companyId && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes acceso a esta función');
    }
    
    return function_;
  }
}
