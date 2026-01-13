import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Sheet } from '../entities/sheet.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private oauth2Client: OAuth2Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Sheet)
    private readonly sheetRepository: Repository<Sheet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_OAUTH_REDIRECT_URL')
    );
  }

  async getSheetsApi(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      return google.sheets({
        version: 'v4',
        auth: this.oauth2Client
      });
    } catch (error) {
      this.logger.error('Error getting sheets API:', error);
      throw new Error('Error getting Google Sheets API: ' + error.message);
    }
  }

  async appendRow(spreadsheetId: string, values: any[], refreshToken: string) {
    try {
      const sheets = await this.getSheetsApi(refreshToken);

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values]
        }
      });

      return {
        success: true,
        updatedRange: response.data.updates.updatedRange
      };
    } catch (error) {
      this.logger.error('Error appending row:', error);
      throw new Error('Error appending row to sheet: ' + error.message);
    }
  }

  async readSheet(spreadsheetId: string, range: string, refreshToken: string) {
    try {
      const sheets = await this.getSheetsApi(refreshToken);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values;
    } catch (error) {
      this.logger.error('Error reading sheet:', error);
      throw new Error('Error reading sheet: ' + error.message);
    }
  }
}