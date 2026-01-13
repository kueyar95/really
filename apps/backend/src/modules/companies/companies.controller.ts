import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, SetMetadata, Patch, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CompanyOnboardingDto } from './dto/company-onboarding.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('companies')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  /**
   * Crea una empresa asignándola al usuario autenticado
   * Este endpoint requiere autenticación pero no roles específicos
   */
  @Post('create-onboarding')
  @UseGuards(SupabaseAuthGuard)
  createOnboarding(
    @Body() createOnboardingDto: CreateOnboardingDto,
    @CurrentUser() user: User
  ) {
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }
    
    return this.companiesService.createWithOnboardingForUser(createOnboardingDto, user);
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  /**
   * Endpoint para el proceso de onboarding que crea una empresa y un usuario administrador
   * Este endpoint no requiere autenticación ni roles específicos
   * @deprecated Usar create-onboarding con autenticación en su lugar
   */
  @Post('onboarding')
  @Public()
  createCompanyOnboarding(@Body() companyOnboardingDto: CompanyOnboardingDto) {
    return this.companiesService.createWithOnboarding(companyOnboardingDto);
  }
}
