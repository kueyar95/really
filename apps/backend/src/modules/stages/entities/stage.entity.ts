import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Funnel } from '../../funnels/entities/funnel.entity';
import { AiBot } from '../../ai-bots/entities/ai-bot.entity';
import { ClientStage } from '../../clients/entities/client-stage.entity';

export enum StageStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'funnel_id' })
  funnelId: string;

  @Column({ name: 'bot_id', nullable: true })
  botId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  order: number;

  @Column({
    type: 'enum',
    enum: StageStatus,
    default: StageStatus.ACTIVE
  })
  status: StageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', name: 'notification_emails', nullable: true, default: [] })
  notificationEmails: string[];

  // Relaciones
  @ManyToOne(() => Funnel, funnel => funnel.stages)
  @JoinColumn({ name: 'funnel_id' })
  funnel: Funnel;

  @ManyToOne(() => AiBot, aiBot => aiBot.stages, { nullable: true })
  @JoinColumn({ name: 'bot_id' })
  bot: AiBot;

  @OneToMany(() => ClientStage, clientStage => clientStage.stage, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  clientStages: ClientStage[];
}
