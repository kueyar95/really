import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotFunction } from '../entities/bot-function.entity';
import { Function } from '../../functions/entities/function.entity';
import { AiBot } from '../entities/ai-bot.entity';
import { FunctionType } from '../../functions/core/types/function.types';

@Injectable()
export class BotFunctionsService {
  constructor(
    @InjectRepository(BotFunction)
    private readonly botFunctionRepository: Repository<BotFunction>,
    @InjectRepository(Function)
    private readonly functionRepository: Repository<Function>,
    @InjectRepository(AiBot)
    private readonly botRepository: Repository<AiBot>,
  ) {}

  async assignFunctionToBot(
    botId: string,
    functionId: string,
    stepNumber?: number,
    contextData?: Record<string, any>,
  ): Promise<BotFunction> {
    // Verificar que el bot existe
    const bot = await this.botRepository.findOneBy({ id: botId });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    // Verificar que la función existe
    const function_ = await this.functionRepository.findOneBy({ id: functionId });
    if (!function_) {
      throw new NotFoundException(`Function with ID ${functionId} not found`);
    }

    // Crear la relación
    const botFunction = this.botFunctionRepository.create({
      botId,
      functionId,
      stepNumber,
      contextData,
    });

    return await this.botFunctionRepository.save(botFunction);
  }

  async getFunctionsByBot(botId: string): Promise<BotFunction[]> {
    return await this.botFunctionRepository.find({
      where: { botId, isActive: true },
      relations: ['function'],
    });
  }

  async getFunctionsByBotAndType(botId: string, type: FunctionType): Promise<BotFunction[]> {
    return await this.botFunctionRepository
      .createQueryBuilder('bf')
      .innerJoinAndSelect('bf.function', 'f')
      .where('bf.botId = :botId', { botId })
      .andWhere('bf.isActive = :isActive', { isActive: true })
      .andWhere('f.type = :type', { type })
      .getMany();
  }

  async getFunctionsByStep(botId: string, stepNumber: number): Promise<BotFunction[]> {
    return await this.botFunctionRepository.find({
      where: { botId, stepNumber, isActive: true },
      relations: ['function'],
    });
  }

  async deactivateFunction(botId: string, functionId: string): Promise<void> {
    const botFunction = await this.botFunctionRepository.findOne({
      where: { botId, functionId },
    });

    if (!botFunction) {
      throw new NotFoundException(`Function relation not found for bot ${botId} and function ${functionId}`);
    }

    botFunction.isActive = false;
    await this.botFunctionRepository.save(botFunction);
  }

  async updateFunctionContext(
    botId: string,
    functionId: string,
    contextData: Record<string, any>,
  ): Promise<BotFunction> {
    const botFunction = await this.botFunctionRepository.findOne({
      where: { botId, functionId },
    });

    if (!botFunction) {
      throw new NotFoundException(`Function relation not found for bot ${botId} and function ${functionId}`);
    }

    botFunction.contextData = contextData;
    return await this.botFunctionRepository.save(botFunction);
  }
} 