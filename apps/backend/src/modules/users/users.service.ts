import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserSignupDto } from './dto/user-signup.dto';
import { Role } from './enums/role.enum';
import { UUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create(createUserDto as DeepPartial<User>);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['company', 'assignedClientStages'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company', 'assignedClientStages'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findBySupabaseId(supabaseId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { supabaseId: supabaseId as UUID },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException(`User with Supabase ID ${supabaseId} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findByCompanyId(companyId: string): Promise<User[]> {
    // Si no se proporciona un companyId, retornar una lista vacía
    if (!companyId) {
      return [];
    }
    
    const users = await this.userRepository.find({
      where: { companyId },
      relations: ['company', 'assignedClientStages'],
      order: {
        role: 'ASC',
        username: 'ASC'
      }
    });

    if (!users.length) {
      return [];
    }

    return users;
  }

  async findByEmailWithNullSupabaseId(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        supabaseId: null
      }
    });

    return user;
  }

  async updateSupabaseId(userId: string, supabaseId: UUID): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    user.supabaseId = supabaseId;
    return await this.userRepository.save(user);
  }

  /**
   * Crea un usuario después del registro en Supabase
   * @param userSignupDto Datos del usuario después del registro
   * @returns Usuario creado
   */
  async createAfterSignup(userSignupDto: UserSignupDto): Promise<User> {
    try {
      // Verificar si ya existe un usuario con ese email
      const existingUser = await this.userRepository.findOne({
        where: { email: userSignupDto.email }
      });

      // Si existe un usuario con ese email...
      if (existingUser) {
        const supabaseIdIsEmpty = !existingUser.supabaseId || (existingUser.supabaseId as unknown as string) === '';
        const supabaseIdMatches = String(existingUser.supabaseId || '') === String(userSignupDto.supabaseId || '');

        // ...y no tiene supabaseId, actualizamos su supabaseId
        if (supabaseIdIsEmpty) {
          existingUser.supabaseId = userSignupDto.supabaseId;
          return await this.userRepository.save(existingUser);
        }

        // ...y ya tiene el mismo supabaseId, hacemos la operación idempotente y devolvemos
        if (supabaseIdMatches) {
          return existingUser;
        }

        // ...y tiene un supabaseId distinto, conflicto
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      const user = this.userRepository.create({
        email: userSignupDto.email,
        supabaseId: userSignupDto.supabaseId,
        username: userSignupDto.username,
        role: Role.PENDING_ONBOARDING,
      });

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Error al crear usuario después del registro: ${error.message}`);
    }
  }
}


