/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAiBotDto } from './dto/create-ai-bot.dto';
import { UpdateAiBotDto } from './dto/update-ai-bot.dto';
import { AiBot } from './entities/ai-bot.entity';
import { Company } from '../companies/entities/company.entity';
import { BotFunction } from './entities/bot-function.entity';
import { Logger } from '@nestjs/common';
@Injectable()

export class AiBotsService {  
  private readonly logger = new Logger(AiBotsService.name);
  constructor(
    @InjectRepository(AiBot)
    private readonly aiBotRepository: Repository<AiBot>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(BotFunction)
    private readonly botFunctionRepository: Repository<BotFunction>
  ) {}

  async findAll(): Promise<AiBot[]> {
    return await this.aiBotRepository.find({
      relations: ['company'],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async findOne(id: string): Promise<AiBot> {
    const bot = await this.aiBotRepository.findOne({
      where: { id },
      relations: ['company']
    });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    return bot;
  }

  async create(createAiBotDto: CreateAiBotDto): Promise<AiBot> {
    // Verificar que la compañía existe
    const company = await this.companyRepository.findOneBy({ id: createAiBotDto.companyId });
    if (!company) {
      throw new BadRequestException(`Company with id ${createAiBotDto.companyId} not found`);
    }

    try {
      const bot = this.aiBotRepository.create({
        ...createAiBotDto,
        mainConfig: createAiBotDto.mainConfig || {
          model: "gpt-4o-mini",
          maxTokens: 400,
          temperature: 0.5
        }
      });
      return await this.aiBotRepository.save(bot);
    } catch (error) {
      throw new BadRequestException('Error creating AI bot: ' + error.message);
    }
  }

  async update(id: string, updateAiBotDto: UpdateAiBotDto): Promise<AiBot> {
    const bot = await this.aiBotRepository.findOneBy({ id });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    Object.assign(bot, updateAiBotDto);
    return await this.aiBotRepository.save(bot);
  }

  async remove(id: string): Promise<void> {
    const bot = await this.findOne(id);
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    //this.logger.debug(`Eliminando bot con ID ${id}`);
    
    // Primero eliminamos todas las relaciones bot-función
    const botFunctions = await this.botFunctionRepository.find({
      where: { botId: id }
    });
    
    if (botFunctions.length > 0) {
      //this.logger.debug(`Eliminando ${botFunctions.length} funciones asociadas al bot ${id}`);
      await this.botFunctionRepository.remove(botFunctions);
    }
    
    // Luego eliminamos el bot
    await this.aiBotRepository.remove(bot);
    //this.logger.debug(`Bot ${id} eliminado exitosamente`);
  }

  async addFunctions(botId: string, functionIds: string[]): Promise<BotFunction[]> {
    // Verificar que el bot existe
    const bot = await this.aiBotRepository.findOne({ where: { id: botId } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    // Crear todas las relaciones bot-función
    const botFunctions = functionIds.map(functionId => 
      this.botFunctionRepository.create({
        botId,
        functionId
      })
    );

    // Guardar todas las relaciones en una sola transacción
    return await this.botFunctionRepository.save(botFunctions);
  }

  async updateSteps(bot: AiBot, steps: any): Promise<any> {
    //this.logger.debug(`Iniciando updateSteps para bot ${bot?.id}`);
    
    if (!bot) {
      //this.logger.error('Bot no encontrado');
      throw new NotFoundException(`Bot with ID ${bot.id} not found`);
    }

    // Actualizar los pasos del bot
    //this.logger.debug(`Actualizando pasos del bot: ${JSON.stringify(steps)}`);
    bot.steps = steps;

    // Extraer todos los IDs de funciones de los pasos
    const stepFunctionIds = new Set<string>();
    steps.forEach(step => {
      if (step.functions && Array.isArray(step.functions)) {
        step.functions.forEach(functionData => {
          // Ahora functionData es un objeto completo, no solo un ID
          if (typeof functionData === 'object' && functionData.id) {
            stepFunctionIds.add(functionData.id);
          } else if (typeof functionData === 'string') {
            // Por compatibilidad, por si aún llegan algunos IDs directos
            stepFunctionIds.add(functionData);
          }
        });
      }
    });
    //this.logger.debug(`IDs de funciones extraídos de los pasos: ${Array.from(stepFunctionIds)}`);

    // Obtener todas las funciones actuales del bot
    //this.logger.debug(`Obteniendo funciones actuales del bot ${bot.id}`);
    const currentBotFunctions = await this.botFunctionRepository.find({
      where: { botId: bot.id }
    });
    //this.logger.debug(`Funciones actuales encontradas: ${currentBotFunctions.length}`);

    // Verificar si hay funciones duplicadas y eliminar las duplicadas
    const functionIdCount = new Map<string, BotFunction[]>();
    
    // Agrupar las asociaciones por functionId
    currentBotFunctions.forEach(bf => {
      if (!functionIdCount.has(bf.functionId)) {
        functionIdCount.set(bf.functionId, []);
      }
      functionIdCount.get(bf.functionId).push(bf);
    });
    
    // Identificar y eliminar duplicados
    const duplicatesToRemove: BotFunction[] = [];
    functionIdCount.forEach((bfs, functionId) => {
      if (bfs.length > 1) {
        // Mantener solo la primera asociación y marcar el resto para eliminar
        //this.logger.debug(`Encontradas ${bfs.length} asociaciones duplicadas para la función ${functionId}`);
        duplicatesToRemove.push(...bfs.slice(1));
      }
    });
    
    if (duplicatesToRemove.length > 0) {
      //this.logger.debug(`Eliminando ${duplicatesToRemove.length} asociaciones duplicadas`);
      await this.botFunctionRepository.remove(duplicatesToRemove);
      
      // Actualizar la lista de funciones actuales después de eliminar duplicados
      const remainingBotFunctions = currentBotFunctions.filter(
        bf => !duplicatesToRemove.some(dup => dup.id === bf.id)
      );
      currentBotFunctions.length = 0;
      currentBotFunctions.push(...remainingBotFunctions);
    }

    // Identificar funciones nuevas que no están asociadas al bot
    const currentFunctionIds = new Set(currentBotFunctions.map(bf => bf.functionId));
    const newFunctionIds = Array.from(stepFunctionIds).filter(id => !currentFunctionIds.has(id));
    //this.logger.debug(`Nuevas funciones a agregar: ${newFunctionIds}`);

    // Identificar funciones que ya no se usan y deben ser eliminadas
    const functionIdsToRemove = Array.from(currentFunctionIds).filter(id => !stepFunctionIds.has(id));
    //this.logger.debug(`Funciones a eliminar: ${functionIdsToRemove}`);

    // Si hay nuevas funciones, asociarlas al bot
    if (newFunctionIds.length > 0) {
      //this.logger.debug(`Creando ${newFunctionIds.length} nuevas asociaciones de funciones`);
      const newBotFunctions = newFunctionIds.map(functionId => 
        this.botFunctionRepository.create({
          botId: bot.id,
          functionId,
          isActive: true
        })
      );

      // Guardar las nuevas asociaciones
      await this.botFunctionRepository.save(newBotFunctions);
      //this.logger.debug('Nuevas asociaciones guardadas exitosamente');
    }

    // Si hay funciones a eliminar, eliminarlas
    if (functionIdsToRemove.length > 0) {
      //this.logger.debug(`Eliminando ${functionIdsToRemove.length} asociaciones de funciones`);
      
      // Encontrar los registros de bot_functions a eliminar
      const botFunctionsToRemove = currentBotFunctions.filter(bf => 
        functionIdsToRemove.includes(bf.functionId)
      );
      
      // Eliminar las asociaciones
      if (botFunctionsToRemove.length > 0) {
        await this.botFunctionRepository.remove(botFunctionsToRemove);
        //this.logger.debug('Asociaciones eliminadas exitosamente');
      }
    }

    // Actualizar los números de paso para cada función
    //this.logger.debug('Iniciando actualización de números de paso');
    
    // Obtener la lista actualizada de funciones después de agregar/eliminar
    const updatedBotFunctions = await this.botFunctionRepository.find({
      where: { botId: bot.id }
    });
    
    for (const step of steps) {
      if (step.functions && Array.isArray(step.functions)) {
        for (const functionData of step.functions) {
          // Extraer el ID de la función (ahora puede ser un objeto o un string)
          const functionId = typeof functionData === 'object' ? functionData.id : functionData;
          
          // Buscar si ya existe esta asociación
          const existingBotFunction = updatedBotFunctions.find(bf => bf.functionId === functionId);
          
          if (existingBotFunction) {
            //this.logger.debug(`Actualizando paso para función ${functionId} a paso ${step.number}`);
            // Actualizar el número de paso
            existingBotFunction.stepNumber = step.number;
            await this.botFunctionRepository.save(existingBotFunction);
          }
        }
      }
    }

    // Actualizar el bloque steps_to_follow en sysPrompt
    //this.logger.debug('Actualizando bloque steps_to_follow en sysPrompt');
    
    // Ya no necesitamos obtener las funciones ni crear un mapa, pues ya tenemos toda la información
    
    // Actualizar o crear el bloque steps_to_follow en sysPrompt
    if (!bot.sysPrompt) {
      bot.sysPrompt = [];
    }
    
    const stepsToFollowIndex = bot.sysPrompt.findIndex(block => block.block_identifier === 'steps_to_follow');
    
    if (stepsToFollowIndex >= 0) {
      // Actualizar el bloque existente
      bot.sysPrompt[stepsToFollowIndex].block_content = JSON.stringify(steps, null, 2);
    } else {
      // Crear un nuevo bloque
      bot.sysPrompt.push({
        block_identifier: 'steps_to_follow',
        block_content: JSON.stringify(steps, null, 2)
      });
    }
    
    await this.aiBotRepository.save(bot);

    // Retornar los pasos originales
    return steps;
  }

  async findByCompany(companyId: string) {
    return this.aiBotRepository.find({
      where: { companyId },
      relations: ['stages', 'botFunctions', 'botFunctions.function'],
      order: {
        createdAt: 'DESC'
      }
    });
  }
}
