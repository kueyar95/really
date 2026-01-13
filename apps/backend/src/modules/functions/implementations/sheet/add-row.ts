import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Function } from '../../entities/function.entity';
import { GoogleSheetConstData } from '../../core/types/sheet.types';
import { GoogleSheetsService } from '@/modules/sheets/services/google-sheets.service';
import { Sheet } from '@/modules/sheets/entities/sheet.entity';

interface AddRowContext {
  companyId: string;
  clientId: string;
  chatHistory?: { role: string; content: string }[];
}

interface AddRowResult {
  success: boolean;
  data: {
    rowNumber?: number;
    values: Record<string, any>;
  };
  error?: string;
}

@Injectable()
export class AddRowImplementation {
  private readonly logger = new Logger(AddRowImplementation.name);

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    @InjectRepository(Sheet)
    private readonly sheetRepository: Repository<Sheet>
  ) {}

  async execute(
    function_: Function,
    args: Record<string, any>,
    context: AddRowContext
  ): Promise<AddRowResult> {
    try {
      const constData = function_.constData as GoogleSheetConstData;

      // Validar argumentos requeridos dinámicamente
      const requiredFields = constData.fields
        .filter(field => field.required)
        .map(field => field.name);

      for (const field of requiredFields) {
        if (!args[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Obtener el token de la compañía
      const sheet = await this.sheetRepository.findOne({
        where: { companyId: context.companyId }
      });

      if (!sheet?.googleRefreshToken) {
        throw new Error('Company has no Google Sheets access configured');
      }

      // Extraer spreadsheetId
      const matches = constData.sheetUrl.match(/[-\w]{25,}/);
      if (!matches) {
        throw new Error('Invalid Google Sheets URL');
      }
      const spreadsheetId = matches[0];

      // Verificar si hay datos existentes
      const existingData = await this.googleSheetsService.readSheet(
        spreadsheetId,
        'A1:Z1',
        sheet.googleRefreshToken
      );

      // Si no hay datos, agregar headers
      if (!existingData || existingData.length === 0) {
        const headers = constData.fields.map(field => field.name);
        await this.googleSheetsService.appendRow(
          spreadsheetId,
          headers,
          sheet.googleRefreshToken
        );
      }

      // Crear array de valores en el orden definido por los campos
      const values = constData.fields.map(field => {
        const value = args[field.name];
        if (field.type === 'date' && value) {
          try {
            // Intentar parsear diferentes formatos de fecha
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date format for field ${field.name}. Expected YYYY-MM-DD`);
            }
            return date.toISOString().split('T')[0]; // Retorna YYYY-MM-DD
          } catch (error) {
            throw new Error(`Invalid date format for field ${field.name}. Expected YYYY-MM-DD`);
          }
        }
        return value || '';
      });

      // Agregar la fila de datos
      const result = await this.googleSheetsService.appendRow(
        spreadsheetId,
        values,
        sheet.googleRefreshToken
      );

      return {
        success: true,
        data: {
          values: args,
          rowNumber: parseInt(result.updatedRange.split('!')[1].match(/\d+/)[0])
        }
      };
    } catch (error) {
      this.logger.error(`Error executing add row: ${error.message}`);
      return {
        success: false,
        data: {
          values: args
        },
        error: error.message
      };
    }
  }
}