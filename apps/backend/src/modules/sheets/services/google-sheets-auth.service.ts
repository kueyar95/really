import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sheet } from '../entities/sheet.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Role } from '@/modules/users/enums/role.enum';

@Injectable()
export class GoogleSheetsAuthService {
  private readonly logger = new Logger(GoogleSheetsAuthService.name);
  private oauth2Client: OAuth2Client;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Sheet)
    private readonly sheetRepository: Repository<Sheet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    this.redirectUri = this.configService.get('GOOGLE_OAUTH_REDIRECT_URL_SHEETS');

    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.redirectUri
    );
  }

  async getStatus(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user || !user.company) {
      return false;
    }

    const sheet = await this.sheetRepository.findOne({
      where: { companyId: user.company.id }
    });

    if (!sheet) {
      return false;
    }

    return !!sheet.googleRefreshToken;
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    this.logger.debug(`Generating auth URL with redirect: ${this.redirectUri}`);

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: this.redirectUri
    });
  }

  async handleCallback(code: string, userId: string): Promise<Sheet> {
    try {
      this.logger.debug(`Handling callback for user ${userId} with code length: ${code.length}`);
      this.logger.debug(`Using redirect URI: ${this.redirectUri}`);

      const { tokens } = await this.oauth2Client.getToken({
        code,
      });

      this.logger.debug('Received tokens from Google');

      if (!tokens.refresh_token) {
        throw new BadRequestException('No refresh token received from Google');
      }

      this.oauth2Client.setCredentials(tokens);

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['company']
      });

      if (!user || !user.company) {
        throw new BadRequestException('User or company not found');
      }

      if (user.role !== Role.ADMIN) {
        throw new BadRequestException('Only administrators can configure sheets');
      }

      // Create or update sheet configuration
      let sheetEntity = await this.sheetRepository.findOne({
        where: { companyId: user.company.id }
      });

      if (!sheetEntity) {
        sheetEntity = this.sheetRepository.create({
          companyId: user.company.id
        });
      }

      sheetEntity.googleRefreshToken = tokens.refresh_token;
      sheetEntity.googleAccessToken = tokens.access_token;

      const savedSheet = await this.sheetRepository.save(sheetEntity);
      this.logger.debug('Sheet configuration saved successfully');

      return savedSheet;

    } catch (error) {
      this.logger.error('Error in handleCallback:', error);
      if (error.message.includes('invalid_grant')) {
        throw new BadRequestException('Invalid authorization code. Please try authenticating again.');
      }
      throw new BadRequestException(error.message);
    }
  }

  async verifyAccess(sheetUrl: string, refreshToken: string): Promise<boolean> {
    try {
      if (!refreshToken) {
        this.logger.error('No refresh token provided');
        return false;
      }

      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      this.logger.debug(`Verifying access to spreadsheet: ${spreadsheetId}`);

      await sheets.spreadsheets.get({
        spreadsheetId
      });

      return true;
    } catch (error) {
      this.logger.error(`Error verifying sheet access: ${error.message}`);
      if (error.response?.data?.error) {
        this.logger.error('Google API Error:', error.response.data.error);
      }
      return false;
    }
  }

  private extractSpreadsheetId(sheetUrl: string): string {
    const matches = sheetUrl.match(/[-\w]{25,}/);
    if (!matches) {
      throw new BadRequestException('Invalid Google Sheets URL');
    }
    return matches[0];
  }

  async revokeAccess(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['company']
      });

      if (!user || !user.company) {
        throw new BadRequestException('User or company not found');
      }

      const sheet = await this.sheetRepository.findOne({
        where: { companyId: user.company.id }
      });

      if (!sheet) {
        throw new BadRequestException('Sheet configuration not found');
      }

      // Intentar revocar el token solo si existe
      if (sheet.googleAccessToken) {
        try {
          await this.oauth2Client.revokeToken(sheet.googleAccessToken);
        } catch (error) {
          // Si el token es inválido o hay otro error, lo registramos pero continuamos
          this.logger.warn(`Error revoking token: ${error.message}`);
        }
      }

      // Siempre limpiar los tokens localmente
      sheet.googleRefreshToken = null;
      sheet.googleAccessToken = null;

      await this.sheetRepository.save(sheet);

      this.logger.log(`Successfully revoked access for company ${user.company.id}`);
    } catch (error) {
      this.logger.error(`Error revoking Google Sheets access: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al revocar el acceso a Google Sheets');
    }
  }
}