import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AiBot } from './ai-bot.entity';
import { Function } from '../../functions/entities/function.entity';

@Entity('bot_functions')
export class BotFunction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bot_id' })
  botId: string;

  @Column({ name: 'function_id' })
  functionId: string;

  @Column({ name: 'step_number', nullable: true })
  stepNumber: number;

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  contextData: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => AiBot, bot => bot.botFunctions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'bot_id' })
  bot: AiBot;

  @ManyToOne(() => Function)
  @JoinColumn({ name: 'function_id' })
  function: Function;
} 