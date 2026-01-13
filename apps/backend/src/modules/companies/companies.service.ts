import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { CompanyOnboardingDto } from './dto/company-onboarding.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { SupabaseAuthService } from '../../auth/supabase.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly usersService: UsersService,
    private readonly supabaseAuthService: SupabaseAuthService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(createCompanyDto);
    return await this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return await this.companyRepository.find({
      relations: ['users', 'channels', 'funnels', 'aiBots'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['users', 'channels', 'funnels', 'aiBots'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }

  async createWithOnboarding(companyOnboardingDto: CompanyOnboardingDto): Promise<Company> {
    try {
      // Obtener datos del usuario desde Supabase
      const supabaseUser = await this.supabaseAuthService.getUserById(companyOnboardingDto.supabaseUserId);
      
      if (!supabaseUser || !supabaseUser.user) {
        throw new BadRequestException('Usuario de Supabase no encontrado');
      }
      
      // Crear la empresa
      const createCompanyDto = new CreateCompanyDto();
      createCompanyDto.name = companyOnboardingDto.name;
      
      if (companyOnboardingDto.website) {
        createCompanyDto['website'] = companyOnboardingDto.website;
      }
      
      const company = await this.create(createCompanyDto);
      
      // Crear el usuario administrador con el email de Supabase
      await this.usersService.create({
        companyId: company.id,
        username: supabaseUser.user.user_metadata?.name || 'Admin', // Usar nombre de metadatos o valor por defecto
        email: supabaseUser.user.email, // Email del usuario en Supabase
        supabaseId: companyOnboardingDto.supabaseUserId,
        role: Role.ADMIN
      });
      
      return company;
    } catch (error) {
      throw new BadRequestException(`Error en el proceso de onboarding: ${error.message}`);
    }
  }

  /**
   * Crea una empresa y la asigna al usuario autenticado
   * @param createOnboardingDto Datos de la empresa
   * @param user Usuario autenticado
   * @returns Empresa creada
   */
  async createWithOnboardingForUser(createOnboardingDto: CreateOnboardingDto, user: User): Promise<Company> {
    try {
      if (!user || !user.id) {
        throw new BadRequestException('Usuario inválido o no autenticado');
      }
      
      // Crear la empresa
      const createCompanyDto = new CreateCompanyDto();
      createCompanyDto.name = createOnboardingDto.name;
      
      if (createOnboardingDto.website) {
        createCompanyDto['website'] = createOnboardingDto.website;
      }
      
      const company = await this.create(createCompanyDto);
      
      // Asignar la empresa al usuario autenticado
      await this.usersService.update(user.id, { companyId: company.id, role: Role.ADMIN });
      
      return company;
    } catch (error) {
      throw new BadRequestException(`Error en el proceso de onboarding: ${error.message}`);
    }
  }
}
