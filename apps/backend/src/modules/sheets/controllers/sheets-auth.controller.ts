import { Controller, Get, Post, Query, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleSheetsAuthService } from '../services/google-sheets-auth.service';
import { SupabaseAuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@/modules/users/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Sheet } from '@/modules/sheets/entities/sheet.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

@Controller('sheets/integrations/google')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SheetsAuthController {
  constructor(
    private readonly googleSheetsAuthService: GoogleSheetsAuthService,
    @InjectRepository(Sheet)
    private readonly sheetRepository: Repository<Sheet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @Get('status')
  @Roles(Role.ADMIN)
  async getStatus(@Req() req: any) {
    const userId = req.user.id;
    const status = await this.googleSheetsAuthService.getStatus(userId);
    return { status };
  }

  @Get('auth-url')
  @Roles(Role.ADMIN)
  async getGoogleAuthUrl() {
    const url = this.googleSheetsAuthService.getAuthUrl();
    return { url };
  }

  @Get('sheets/callback')
  @Roles(Role.ADMIN)
  async handleGoogleCallback(
    @Query('code') code: string,
    @Req() req: any
  ) {
    const userId = req.user.id;
    const sheet = await this.googleSheetsAuthService.handleCallback(code, userId);
    return { success: true, sheet };
  }

  @Post('disconnect')
  @Roles(Role.ADMIN)
  async disconnectGoogle(@Req() req: any) {
    const userId = req.user.id;
    await this.googleSheetsAuthService.revokeAccess(userId);
    return { success: true };
  }

  @Get('verify-access')
  @Roles(Role.ADMIN)
  async verifySheetAccess(
    @Query('sheetUrl') sheetUrl: string,
    @Req() req: any
  ) {
    const userId = req.user.id;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user?.company) {
      throw new BadRequestException('User or company not found');
    }

    const sheet = await this.sheetRepository.findOne({
      where: { companyId: user.company.id }
    });

    if (!sheet?.googleRefreshToken) {
      return { hasAccess: false, message: 'No Google Sheets integration configured' };
    }

    const hasAccess = await this.googleSheetsAuthService.verifyAccess(
      sheetUrl,
      sheet.googleRefreshToken
    );

    return { hasAccess };
  }
}