import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { BotFunction } from './bot-function.entity';
import { StepFunction } from '../interfaces/step-function.interface';

export interface PromptBlock {
  block_identifier: string;
  block_content: string;
}

interface BotStep {
  number: number;
  text: string;
  functions?: StepFunction[];
}

@Entity('ai_bots')
export class AiBot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  ragConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  functionsConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  sysPrompt: PromptBlock[];

  @Column({ type: 'jsonb', nullable: true })
  mainConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  steps: BotStep[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Company, company => company.aiBots)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Stage, stage => stage.bot)
  stages: Stage[];

  @OneToMany(() => BotFunction, botFunction => botFunction.bot, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  botFunctions: BotFunction[];
}