import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatHistory } from '../entities/chat-history.entity';
import { CreateChatHistoryDto } from '../dtos/chat-history.dto';
import { ClientStage } from '../entities/client-stage.entity';
import { Funnel } from '../../funnels/entities/funnel.entity';
import { ClientsService } from './clients.service';
import { Client } from '../entities/client.entity';
import axios from 'axios';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectRepository(ChatHistory)
    private chatHistoryRepository: Repository<ChatHistory>,
    @InjectRepository(ClientStage)
    private clientStageRepository: Repository<ClientStage>,
    private clientsService: ClientsService,
    @InjectRepository(Funnel)
    private funnelRepository: Repository<Funnel>,
  ) {}

  async create(createChatHistoryDto: CreateChatHistoryDto): Promise<ChatHistory> {
    const chatHistory = this.chatHistoryRepository.create(createChatHistoryDto);
    return await this.chatHistoryRepository.save(chatHistory);
  }

  async findByClientId(clientId: string, channelId?: string): Promise<ChatHistory[]> {
    const whereCondition: any = { clientId };
    
    // Si se proporciona channelId, filtrar por ese canal específico
    if (channelId) {
      whereCondition.channelId = channelId;
    }
    
    const messages = await this.chatHistoryRepository.find({
      where: whereCondition,
      relations: ['channel'],
      order: { createdAt: 'ASC' },
      take: 100, // OPTIMIZACIÓN: Limitar a los últimos 100 mensajes por defecto
      // Para cargar más, usar findByClientIdPaginated()
    });
    
    this.logger.log(`findByClientId: ${messages.length} mensajes encontrados para cliente ${clientId}, canal ${channelId || 'todos'}`);
    
    return messages;
  }

  /**
   * Método con paginación para cargar historial de chat de forma eficiente
   * @param clientId ID del cliente
   * @param channelId ID del canal (opcional)
   * @param page Número de página (empezando en 1)
   * @param limit Cantidad de mensajes por página (default: 50)
   * @returns Objeto con data paginada, total de registros, página actual y total de páginas
   */
  async findByClientIdPaginated(
    clientId: string,
    channelId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    data: ChatHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.chatHistoryRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.channel', 'channel')
      .where('chat.clientId = :clientId', { clientId })
      .orderBy('chat.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    if (channelId) {
      queryBuilder.andWhere('chat.channelId = :channelId', { channelId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByChannelId(channelId: string, companyId?: string): Promise<any> {
    const queryBuilder = this.chatHistoryRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.client', 'client')
      .leftJoinAndSelect('client.clientStages', 'clientStages')
      .leftJoinAndSelect('clientStages.stage', 'stage')
      .leftJoinAndSelect('stage.bot', 'bot')
      .leftJoinAndSelect('clientStages.assignedUser', 'assignedUser')
      .where('chat.channelId = :channelId', { channelId });

    // Filtrar por companyId del cliente si se proporciona
    if (companyId) {
      queryBuilder.andWhere('client.companyId = :companyId', { companyId });
    }

    const chats = await queryBuilder
      .orderBy('chat.createdAt', 'DESC')
      .getMany();

    // Agrupar chats por cliente
    const clientsMap = new Map();

    chats.forEach(chat => {
      if (!clientsMap.has(chat.clientId)) {
        const activeStage = chat.client.clientStages?.[0];
        clientsMap.set(chat.clientId, {
          id: chat.client.id,
          name: chat.client.name,
          phone: chat.client.phone,
          email: chat.client.email,
          stage: activeStage?.stage,
          hasBot: !!activeStage?.stage?.bot,
          assignedUser: activeStage?.assignedUser,
          lastMessage: {
            content: chat.message,
            direction: chat.direction,
            createdAt: chat.createdAt
          }
        });
      }
    });

    return Array.from(clientsMap.values());
  }

  async findByFunnelId(funnelId: string): Promise<any> {
    // Obtenemos el funnel con todas sus relaciones
    const funnel = await this.funnelRepository
      .createQueryBuilder('funnel')
      .leftJoinAndSelect('funnel.funnelChannels', 'funnelChannels')
      .leftJoinAndSelect('funnelChannels.channel', 'channel')
      .leftJoinAndSelect('funnel.stages', 'stages')
      .where('funnel.id = :funnelId', { funnelId })
      .getOne();

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID ${funnelId} not found`);
    }

    const channelIds = funnel.funnelChannels.map(fc => fc.channelId);

    // Filtrar por client.companyId del funnel para evitar ver chats de otras compañías
    const chats = await this.chatHistoryRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.client', 'client')
      .leftJoinAndSelect('client.clientStages', 'clientStages')
      .leftJoinAndSelect('clientStages.stage', 'stage')
      .leftJoinAndSelect('stage.bot', 'bot')
      .leftJoinAndSelect('clientStages.assignedUser', 'assignedUser')
      .leftJoinAndSelect('chat.channel', 'channel')
      .where('chat.channelId IN (:...channelIds)', { channelIds })
      .andWhere('client.companyId = :companyId', { companyId: funnel.companyId })
      .orderBy('chat.createdAt', 'DESC')
      .getMany();

    // Agrupar por canal y cliente
    const channelsMap = new Map();

    chats.forEach(chat => {
      if (!channelsMap.has(chat.channelId)) {
        channelsMap.set(chat.channelId, new Map());
      }

      const clientsMap = channelsMap.get(chat.channelId);
      if (!clientsMap.has(chat.clientId)) {
        const activeStage = chat.client.clientStages?.[0];
        clientsMap.set(chat.clientId, {
          id: chat.client.id,
          name: chat.client.name,
          phone: chat.client.phone,
          email: chat.client.email,
          stage: activeStage?.stage,
          hasBot: !!activeStage?.stage?.bot,
          assignedUser: activeStage?.assignedUser,
          lastMessage: {
            content: chat.message,
            direction: chat.direction,
            createdAt: chat.createdAt
          }
        });
      }
    });

    return {
      id: funnel.id,
      name: funnel.name,
      stages: funnel.stages,
      channels: funnel.funnelChannels.map(fc => ({
        id: fc.channel.id,
        name: fc.channel.name,
        type: fc.channel.type,
        status: fc.channel.status,
        isActive: fc.isActive,
        clients: Array.from(channelsMap.get(fc.channelId)?.values() || [])
      }))
    };
  }

  async findByCompanyId(companyId: string): Promise<any> {
    // Primero obtenemos todos los funnels de la compañía con sus canales
    const funnels = await this.funnelRepository
      .createQueryBuilder('funnel')
      .leftJoinAndSelect('funnel.funnelChannels', 'funnelChannels')
      .leftJoinAndSelect('funnelChannels.channel', 'channel')
      .leftJoinAndSelect('funnel.stages', 'stages')
      .where('funnel.companyId = :companyId', { companyId })
      .getMany();

    // Obtenemos todos los channelIds de la compañía
    const channelIds = funnels
      .flatMap(funnel => funnel.funnelChannels)
      .map(fc => fc.channelId);

    if (channelIds.length === 0) {
      // No hay canales con historial aún, pero igualmente devolvemos la estructura de funnels y canales
      return {
        funnels: funnels.map(funnel => ({
          id: funnel.id,
          name: funnel.name,
          stages: funnel.stages,
          channels: funnel.funnelChannels.map(fc => ({
            id: fc.channel.id,
            name: fc.channel.name,
            type: fc.channel.type,
            status: fc.channel.status,
            isActive: fc.isActive,
            clients: []
          }))
        }))
      };
    }

    // Obtenemos todos los chats con sus relaciones
    // IMPORTANTE: Filtrar por client.companyId para evitar ver chats de otras compañías
    const chats = await this.chatHistoryRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.client', 'client')
      .leftJoinAndSelect('client.clientStages', 'clientStages', 'clientStages.status = :status', { status: 'ACTIVE' })
      .leftJoinAndSelect('clientStages.stage', 'stage')
      .leftJoinAndSelect('stage.bot', 'bot')
      .leftJoinAndSelect('clientStages.assignedUser', 'assignedUser')
      .leftJoinAndSelect('chat.channel', 'channel')
      .where('chat.channelId IN (:...channelIds)', { channelIds })
      .andWhere('client.companyId = :companyId', { companyId })
      .orderBy('chat.createdAt', 'DESC')
      .getMany();

    // Agrupar por cliente Y canal (para soportar múltiples canales)
    const clientsMap = new Map();

    chats.forEach(chat => {
      // Usar combinación de clientId-channelId como key para permitir
      // que el mismo cliente aparezca en múltiples canales
      const key = `${chat.clientId}-${chat.channelId}`;
      
      if (!clientsMap.has(key)) {
        const activeStage = chat.client.clientStages?.[0];
        clientsMap.set(key, {
          id: chat.client.id,
          name: chat.client.name,
          phone: chat.client.phone,
          email: chat.client.email,
          channelId: chat.channelId,
          channel: chat.channel,
          stage: activeStage?.stage,
          hasBot: !!activeStage?.stage?.bot,
          assignedUser: activeStage?.assignedUser,
          lastMessage: {
            message: chat.message,
            direction: chat.direction,
            createdAt: chat.createdAt
          }
        });
      }
    });

    return {
      funnels: funnels.map(funnel => ({
        id: funnel.id,
        name: funnel.name,
        stages: funnel.stages,
        channels: funnel.funnelChannels.map(fc => ({
          id: fc.channel.id,
          name: fc.channel.name,
          type: fc.channel.type,
          status: fc.channel.status,
          isActive: fc.isActive,
          clients: Array.from(clientsMap.values())
            .filter(client => client.channelId === fc.channelId)
        }))
      }))
    };
  }

  async processMultiAgent(
    input: string,
    sessionId: string,
    companyId: string,
    channelId: string,
  ): Promise<string> {
    if (!companyId) {
      throw new Error('companyId is required to process multi-agent chat');
    }

    // Buscar o crear cliente basado en sessionId (phone) Y companyId
    const client = await this.clientsService.findOrCreateByPhoneAndCompany(
      sessionId,
      companyId,
      {
        name: `Session ${sessionId}`,
        email: `session_${sessionId}@temp.com`,
      },
    );

    // Guardar el mensaje entrante
    await this.create({
      clientId: client.id,
      channelId: channelId,
      message: input,
      direction: 'incoming',
      sessionId: sessionId,
    });
    
    // Obtener el historial del chat para este cliente (company-scoped) y sesión
    const chatHistoryForAI = await this.chatHistoryRepository.find({
      where: {
        clientId: client.id,
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    const formattedHistory = chatHistoryForAI.map(chat => ({
      role: chat.direction === 'incoming' ? 'user' : 'assistant',
      content: chat.message,
    }));

    // Simulación de respuesta de IA para el ejemplo
    const aiResponseContent = `Response based on history for ${client.name} of company ${companyId}: ${input}`;

    // Guardar la respuesta de la IA
    await this.create({
      clientId: client.id,
      channelId: channelId,
      message: aiResponseContent,
      direction: 'outgoing',
      sessionId: sessionId,
    });

    return aiResponseContent;
  }

  async getClientMessages(clientId: string, page: number = 1, limit: number = 10): Promise<any> {
    const [messages, total] = await this.chatHistoryRepository.findAndCount({
      where: { clientId },
      order: { createdAt: 'ASC' },
      relations: ['channel'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}