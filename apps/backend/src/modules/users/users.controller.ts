import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseAuthGuard } from '../../auth/guards/auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { User } from './entities/user.entity';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserSignupDto } from './dto/user-signup.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  @Get('company/:companyId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async findByCompanyId(@Param('companyId') companyId: string) {
    return this.usersService.findByCompanyId(companyId);
  }

  @Get('company')
  @UseGuards(SupabaseAuthGuard)
  @Roles(Role.ADMIN)
  async findByCompany(@CurrentUser() user: User) {
    return this.usersService.findByCompanyId(user.companyId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('supabase/:supabaseId')
  @Public()
  findBySupabaseId(@Param('supabaseId') supabaseId: string) {
    return this.usersService.findBySupabaseId(supabaseId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('check-email/:email')
  async checkEmailExists(@Param('email') email: string) {
    const user = await this.usersService.findByEmailWithNullSupabaseId(email);
    return {
      exists: !!user,
      id: user?.id,
      userData: user
    };
  }

  /**
   * Endpoint para crear un usuario después del registro en Supabase
   * Este endpoint no requiere autenticación
   */
  @Post('signup')
  @Public()
  async createAfterSignup(@Body() userSignupDto: UserSignupDto) {
    return this.usersService.createAfterSignup(userSignupDto);
  }
}
