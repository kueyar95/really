/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Function } from './entities/function.entity';
import { FunctionType, GoogleCalendarAvailabilityConstData, GoogleCalendarAvailabilityParameters, GoogleCalendarParameters, GoogleSheetParameters } from './core/types/function.types';
import { ChangeStageImplementation } from './implementations/stage/change-stage';
import { GetAvailabilityImplementation } from './implementations/calendar/get-availability';
import { CreateEventImplementation } from './implementations/calendar/create-event';
import { FunctionParameters, FunctionConstData } from './core/types/function.types';
import { ChangeStageParameters, ChangeStageConstData } from './core/types/function.types';
import { CreateChangeStageData, CreateGoogleCalendarData, CreateGoogleSheetData } from './dto/create-function.dto';
import { DeepPartial } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Stage } from '../stages/entities/stage.entity';
import { AddRowImplementation } from './implementations/sheet/add-row';
import { ListEventsImplementation } from './implementations/calendar/list-events';
import { UpdateEventImplementation } from './implementations/calendar/update-event';
import { DeleteEventImplementation } from './implementations/calendar/delete-event';

// Interfaces para el servicio
interface ExecutionContext {
  companyId: string;
  clientId?: string;
  stageId?: string;
  funnelId?: string;
  chatHistory?: { role: string; content: string }[];
  contextData?: Record<string, any>;
}

interface FunctionResult {
  success: boolean;
  data: any;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FunctionsService {
  private readonly logger = new Logger(FunctionsService.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Function)
    private readonly functionRepository: Repository<Function>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
    private readonly changeStageImplementation: ChangeStageImplementation,
    private readonly getAvailabilityImplementation: GetAvailabilityImplementation,
    private readonly createEventImplementation: CreateEventImplementation,
    private readonly addRowImplementation: AddRowImplementation,
    private readonly listEventsImplementation: ListEventsImplementation,
    private readonly updateEventImplementation: UpdateEventImplementation,
    private readonly deleteEventImplementation: DeleteEventImplementation
  ) {}

  private async generateUniqueId(): Promise<string> {
    let isUnique = false;
    let functionId: string;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      functionId = uuidv4();
      // Verificar si el ID ya existe
      const existingFunction = await this.functionRepository.findOne({
        where: { id: functionId }
      });

      if (!existingFunction) {
        isUnique = true;
        this.logger.log(`UUID único generado: ${functionId}`);
        return functionId;
      }

      attempts++;
      this.logger.warn(`Intento ${attempts}: UUID ${functionId} ya existe`);
    }

    this.logger.error(`No se pudo generar un UUID único después de ${maxAttempts} intentos`);
    throw new Error('No se pudo generar un UUID único');
  }

  async findOne(id: string): Promise<Function> {
    const function_ = await this.functionRepository.findOne({
      where: { id },
      relations: ['company']
    });

    if (!function_) {
      throw new NotFoundException(`Function with ID ${id} not found`);
    }

    return function_;
  }

  async findByCompany(companyId: string): Promise<Function[]> {
    this.logger.log(`Obteniendo funciones para la compañía: ${companyId}`);

    const functions = await this.functionRepository.find({
      where: { companyId },
      order: {
        createdAt: 'DESC' // Ordenar por fecha de creación, las más recientes primero
      }
    });

    this.logger.log(`Se encontraron ${functions.length} funciones para la compañía`);

    // Enriquecer las funciones de tipo change_stage con información del stage y funnel
    const enrichedFunctions = await Promise.all(functions.map(async (func) => {
      if (func.type === FunctionType.CHANGE_STAGE) {
        try {
          // Verificar que constData es del tipo correcto y tiene stageId
          const constData = func.constData as ChangeStageConstData;
          if (constData && constData.stageId) {
            // Buscar el stage en la base de datos
            const stageId = constData.stageId;

            try {
              // Usar el repositorio de Stage inyectado
              const stage = await this.stageRepository.findOne({
                where: { id: stageId },
                relations: ['funnel']
              });

              if (stage) {
                // Crear un objeto con la información adicional
                const enrichedData = {
                  ...constData,
                  // Agregamos estas propiedades como metadatos adicionales que no afectan el tipo
                  _stageName: stage.name,
                  _funnelId: stage.funnelId,
                  _funnelName: stage.funnel ? stage.funnel.name : 'Desconocido'
                };

                // Asignar el objeto enriquecido de vuelta a constData
                func.constData = enrichedData;
              }
            } catch (dbError) {
              this.logger.error(`Error de base de datos al buscar stage: ${dbError.message}`);
            }
          }
        } catch (error) {
          this.logger.error(`Error al obtener información del stage para la función ${func.id}: ${error.message}`);
        }
      }
      return func;
    }));

    return enrichedFunctions;
  }

  async findAll(): Promise<Function[]> {
    this.logger.log('Obteniendo todas las funciones');

    const functions = await this.functionRepository.find({
      order: {
        createdAt: 'DESC'
      },
      relations: ['company']
    });

    this.logger.log(`Se encontraron ${functions.length} funciones en total`);
    return functions;
  }

  async executeFunction(
    functionId: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<FunctionResult> {
    try {
      this.logger.log(`Executing function ${functionId} with args: ${JSON.stringify(args)}`);

      // 1. Obtener la función
      const function_ = await this.findOne(functionId);

      // 2. Validar que la función pertenece a la compañía
      if (function_.companyId !== context.companyId) {
        throw new Error('Function does not belong to the company');
      }

      // 3. Validar contexto según tipo
      this.validateContext(function_.type, context);

      // 4. Ejecutar según tipo
      let result: FunctionResult;

      switch (function_.type) {
        case FunctionType.CHANGE_STAGE:
          if (!context.clientId || !context.funnelId) {
            throw new Error('Client ID and Funnel ID are required for change stage');
          }
          result = await this.changeStageImplementation.execute(
            function_,
            args,
            {
              companyId: context.companyId,
              clientId: context.clientId,
              stageId: context.stageId,
              funnelId: context.funnelId
            }
          );
          break;

        case FunctionType.GOOGLE_CALENDAR:
          switch(function_.constData.type) {
            case 'get-availability':
              result = await this.getAvailabilityImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
            case 'create-event':
              result = await this.createEventImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
            case 'update-event':
              result = await this.updateEventImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
            case 'list-events':
              result = await this.listEventsImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
            case 'delete-event':
              result = await this.deleteEventImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
            default:
              throw new Error(`Unsupported calendar action: ${function_.constData.type}`);
          }
          break;

        case FunctionType.GOOGLE_SHEET:
              result = await this.addRowImplementation.execute(
                function_,
                args,
                {
                  companyId: context.companyId,
                  clientId: context.clientId,
                  chatHistory: context.chatHistory
                }
              );
              break;
        default:
          throw new Error(`Unsupported function type: ${function_.type}`);
      }

      // 5. Logging del resultado
      this.logger.log(`Function ${functionId} executed with result: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      this.logger.error(`Error executing function ${functionId}: ${error.message}`);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  private validateContext(type: FunctionType, context: ExecutionContext): void {
    switch (type) {
      case FunctionType.CHANGE_STAGE:
        if (!context.clientId || !context.funnelId) {
          throw new Error('Client ID and Funnel ID are required for change stage');
        }
        break;

      case FunctionType.GOOGLE_CALENDAR:
        if (!context.clientId) {
          throw new Error('Client ID is required for calendar operations');
        }
        break;
    }
  }

  private async createChangeStageFunction(companyId: string, data: CreateChangeStageData): Promise<DeepPartial<Function>> {
    const parameters: ChangeStageParameters = {
      type: 'object',
      properties: {
        stageId: {
          type: 'string',
          description: `Value: ${data.stageId}`,
          const: data.stageId,
          enum: [data.stageId]
        }
      },
      required: ['stageId']
    };

    // Generar un UUID único verificando en la base de datos
    const functionId = await this.generateUniqueId();
    const shortId = functionId.split('-')[0];
    const externalName = `${shortId}_change_stage`;

    this.logger.log(`Generando external_name para función: ${externalName}`);

    return {
      id: functionId,
      companyId,
      type: FunctionType.CHANGE_STAGE,
      name: data.name,
      description: data.description,
      external_name: externalName,
      activationDescription: data.description,
      parameters,
      constData: {
        type: FunctionType.CHANGE_STAGE,
        stageId: data.stageId,
        name: data.name,
        description: data.description,
      }
    };
  }

  private async createGoogleCalendarFunction(companyId: string, data: CreateGoogleCalendarData): Promise<DeepPartial<Function>> {
    let parameters: GoogleCalendarParameters;

    if (data.constData.type === 'get-availability') {
      // Parámetros para consulta de disponibilidad
      parameters = {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha para consultar disponibilidad (formato YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin para consultar disponibilidad (formato YYYY-MM-DD)'
          }
        },
        required: ['date']
      };
    } else if (data.constData.type === 'create-event') {
      // Parámetros para creación de eventos
      parameters = {
        type: 'object',
        properties: {
          startTime: {
            type: 'string',
            description: 'Hora de inicio del evento (formato ISO o HH:MM)'
          },
          date: {
            type: 'string',
            description: 'Fecha del evento (formato YYYY-MM-DD)'
          },
          name: {
            type: 'string',
            description: 'Nombre o título del evento'
          },
          email: {
            type: 'string',
            description: 'Email del cliente para incluirlo como invitado'
          },
          attendeeName: {
            type: 'string',
            description: 'Nombre del cliente para incluirlo como invitado'
          }
        },
        required: ['startTime', 'email', 'date']
      };
    } else if (data.constData.type === 'update-event') {
      parameters = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título del evento a actualizar'
          },
          startTime: {
            type: 'string',
            description: 'Nueva hora del evento (formato HH:MM)'
          },
          newTitle: {
            type: 'string',
            description: 'Nuevo título para el evento (opcional)'
          },
          date: {
            type: 'string',
            description: 'Fecha del evento a buscar (formato YYYY-MM-DD)'
          },
          newDate: {
            type: 'string',
            description: 'Nueva fecha para el evento (formato YYYY-MM-DD). Si no se especifica, se mantiene la fecha actual'
          },
          description: {
            type: 'string',
            description: 'Nueva descripción del evento (opcional)'
          }
        },
        required: ['title', 'startTime', 'date']
      };
    } else if (data.constData.type === 'delete-event') {
      parameters = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título del evento a eliminar'
          },
          date: {
            type: 'string',
            description: 'Fecha del evento (formato YYYY-MM-DD)'
          }
        },
        required: ['title', 'date']
      };
    } else if (data.constData.type === 'list-events') {
      parameters = {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha específica para buscar eventos (formato YYYY-MM-DD)'
          },
          startDate: {
            type: 'string',
            description: 'Fecha de inicio del rango (formato YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin del rango (formato YYYY-MM-DD)'
          }
        },
        required: ['date']
      };
    } else {
      throw new BadRequestException(`Tipo de función de calendario no soportado: ${data.constData.type}`);
    }

    // Generar identificadores
    const functionId = await this.generateUniqueId();
    const shortId = functionId.split('-')[0];
    const externalName = `${shortId}_google_calendar_${data.constData.type}`;

    this.logger.log(`Generando external_name para función de calendario: ${externalName}`);

    // Verificar campos obligatorios del constData
    if (!data.constData.calendarId) {
      throw new BadRequestException('Calendar selection is required');
    }

    // Construir el constData adecuadamente según el tipo
    let constData: any;
    // Campos base comunes para ambos tipos
    const baseConstData = {
      type: data.constData.type,
      calendarId: data.constData.calendarId,
      name: data.name || '',
      duration: data.constData.duration || '60',
    };

    // Aplicar cualquier configuración específica según el tipo
    if (data.constData.type === 'get-availability') {
      constData = {
        ...baseConstData
      };
    } else if (data.constData.type === 'create-event') {
      constData = {
        ...baseConstData,
        createMeet: data.createMeet !== undefined ? data.createMeet : true,
        sendNotifications: true,
        eventName: data.eventName || 'Reunión programada',
        description: data.description || '',
      };
    } else if (data.constData.type === 'update-event') {
      constData = {
        ...baseConstData,
        title: data.title,
        startTime: data.startTime,
        date: data.date,
        description: data.description,
      };
    } else if (data.constData.type === 'delete-event') {
      constData = {
        ...baseConstData,
        title: data.title,
        date: data.date
      };
    } else if (data.constData.type === 'list-events') {
      constData = {
        ...baseConstData,
        date: data.date,
        searchTerm: data.searchTerm,
      };
    }

    this.logger.log(`Datos de configuración: ${JSON.stringify(constData)}`);

    return {
      id: functionId,
      companyId,
      type: FunctionType.GOOGLE_CALENDAR,
      name: data.name,
      description: data.description,
      external_name: externalName,
      activationDescription: data.description,
      parameters,
      constData
    };
  }

  private async createGoogleSheetFunction(companyId: string, data: CreateGoogleSheetData): Promise<DeepPartial<Function>> {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    data.fields.forEach(field => {
      // Mapear a tipos válidos de OpenAI
      const openAIType = field.type === 'date' ? 'string' : field.type;

      properties[field.name] = {
        type: openAIType,
        description: `${field.description}. Debe ser solicitado directamente al cliente.` + (field.type === 'date' ? ' Debe ser proporcionado en formato YYYY-MM-DD (ejemplo: 2024-03-20).' : '')
      };

      if (field.required) {
        required.push(field.name);
      }
    });

    const parameters: GoogleSheetParameters = {
      type: 'object',
      properties,
      required
    };

    const functionId = await this.generateUniqueId();
    const shortId = functionId.split('-')[0];
    const externalName = `${shortId}_google_sheet`;

    return {
      id: functionId,
      companyId,
      type: FunctionType.GOOGLE_SHEET,
      name: data.name,
      description: data.description,
      external_name: externalName,
      activationDescription: 'Solicitar y recopilar información del cliente. No inventar datos. Cada campo debe ser proporcionado por el cliente.',
      parameters,
      constData: {
        type: FunctionType.GOOGLE_SHEET,
        sheetUrl: data.sheetUrl,
        name: data.name,
        description: data.description,
        activationDescription: 'Antes de ejecutar esta función, asegúrate de tener todos los datos requeridos del cliente. Solicita cada campo faltante de manera individual y clara.',
        fields: data.fields
      }
    };
  }


  async create(companyId: string, type: FunctionType, data: CreateChangeStageData | CreateGoogleCalendarData): Promise<Function> {
    try {
      let functionData: DeepPartial<Function>;

      switch (type) {
        case FunctionType.CHANGE_STAGE:
          if (!('stageId' in data)) {
            throw new BadRequestException('Stage ID is required for change stage function');
          }
          functionData = await this.createChangeStageFunction(companyId, data as CreateChangeStageData);
          break;

        case FunctionType.GOOGLE_CALENDAR:
          if (!('constData' in data) || !('type' in data.constData)) {
            throw new BadRequestException('Calendar function subtype is required');
          }
          if (data.constData.type !== 'get-availability' && data.constData.type !== 'create-event' && data.constData.type !== 'update-event' && data.constData.type !== 'list-events' && data.constData.type !== 'delete-event') {
            throw new BadRequestException(`Unsupported calendar function subtype: ${data.constData.type}`);
          }
          functionData = await this.createGoogleCalendarFunction(companyId, data as CreateGoogleCalendarData);
          break;

        case FunctionType.GOOGLE_SHEET:
          if (!('fields' in data)) {
            throw new BadRequestException('Fields are required for google sheet function');
          }
          functionData = await this.createGoogleSheetFunction(companyId, data as unknown as CreateGoogleSheetData);
          break;

        default:
          throw new BadRequestException(`Unsupported function type: ${type}`);
      }

      // Crear la entidad
      const function_ = this.functionRepository.create(functionData);

      // Guardar y verificar que el external_name se haya guardado correctamente
      const savedFunction = await this.functionRepository.save(function_);

      if (!savedFunction.external_name) {
        this.logger.error('Error: external_name no se guardó correctamente');
        throw new Error('Failed to save function with external_name');
      }

      this.logger.log(`Función creada exitosamente con external_name: ${savedFunction.external_name}`);
      return savedFunction;

    } catch (error) {
      this.logger.error(`Error creando función: ${error.message}`);
      throw error;
    }
  }
}