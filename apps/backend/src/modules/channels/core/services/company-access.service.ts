import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Company } from '../../../companies/entities/company.entity';
import { UUID } from 'crypto';

@Injectable()
export class CompanyAccessService {
  private readonly logger = new Logger('CompanyAccessService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async validateUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { supabaseId: userId as UUID },
        relations: ['company']
      });

      if (!user) {
        throw new WsException('Usuario no encontrado');
      }

      const hasAccess = user.companyId === companyId;

      if (!hasAccess) {
        this.logger.warn(`Usuario ${userId} intentó acceder a la compañía ${companyId} sin autorización`);
        throw new WsException('No tienes acceso a esta compañía');
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validando acceso: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  async getUserCompany(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { supabaseId: userId as UUID },
        relations: ['company']
      });
    } catch (error) {
      this.logger.error(`Error obteniendo compañía del usuario: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  async getCompanyUsers(companyId: string): Promise<User[]> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: ['users']
      });

      if (!company) {
        throw new WsException('Compañía no encontrada');
      }

      return company.users;
    } catch (error) {
      this.logger.error(`Error obteniendo usuarios de la compañía: ${error.message}`);
      throw new WsException(error.message);
    }
  }
}