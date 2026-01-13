import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from '../dtos/create-client.dto';
import { Client } from '../entities/client.entity';
import { UpdateClientDto } from '../dtos/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Check if client with this phone already exists for this company
    const existingClient = await this.clientRepository.findOne({
      where: {
        phone: createClientDto.phone,
        companyId: createClientDto.companyId,
      },
    });

    if (existingClient) {
      throw new ConflictException(
        `Client with phone ${createClientDto.phone} already exists for company ${createClientDto.companyId}`,
      );
    }

    const client = this.clientRepository.create(createClientDto);
    return await this.clientRepository.save(client);
  }

  async findOrCreateByPhoneAndCompany(
    phone: string,
    companyId: string,
    defaults?: Partial<CreateClientDto>,
  ): Promise<Client> {
    let client = await this.clientRepository.findOne({
      where: { phone, companyId },
      // NOTA: Se removieron 'clientStages' y 'chatHistories' para optimizar
      // Estas relaciones pueden contener miles de registros por cliente
    });

    if (!client) {
      const clientData = {
        phone,
        companyId,
        name: defaults?.name || phone, // Default name to phone if not provided
        email: defaults?.email || `${phone}@example.com`, // Placeholder email
        data: defaults?.data || {},
        ...defaults,
      };
      const newClient = this.clientRepository.create(clientData);
      client = await this.clientRepository.save(newClient);
    }
    return client;
  }

  async findAll(companyId?: string): Promise<Client[]> {
    const findOptions: any = {
      relations: ['company'],
      // NOTA: Se removieron 'clientStages' y 'chatHistories' para optimización
      // Cargar estas relaciones para todos los clientes puede generar millones de filas
    };
    if (companyId) {
      findOptions.where = { companyId };
    }
    return await this.clientRepository.find(findOptions);
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['company'],
      // NOTA: Se removieron 'clientStages' y 'chatHistories' para optimización
      // Usar métodos específicos si se necesitan estas relaciones
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  // It's important to consider if companyId should be part of UpdateClientDto
  // Generally, a client's association with a company shouldn't change via a simple update.
  // If a client moves company, it might be a new client record for the new company.
  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    // Ensure client is updated within its original company context if necessary,
    // though `id` is globally unique. UpdateClientDto does not currently have companyId.
    const client = await this.findOne(id); 
    
    // Prevent changing phone to one that already exists for the *same company*
    if (updateClientDto.phone && updateClientDto.phone !== client.phone) {
        const existingClientWithNewPhone = await this.clientRepository.findOne({
            where: { phone: updateClientDto.phone, companyId: client.companyId }
        });
        if (existingClientWithNewPhone && existingClientWithNewPhone.id !== id) {
            throw new ConflictException(`Another client with phone ${updateClientDto.phone} already exists for this company.`);
        }
    }

    Object.assign(client, updateClientDto);
    return await this.clientRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id); // Ensures client exists before attempting removal
    await this.clientRepository.remove(client);
  }
}
