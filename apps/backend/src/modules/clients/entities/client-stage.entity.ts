import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from './client.entity';
import { User } from '../../users/entities/user.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { FunnelChannel } from '../../funnels/entities/funnel-channel.entity';

@Entity('client_stages')
export class ClientStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stage_id' })
  stageId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'funnel_channel_id' })
  funnelChannelId: string;

  @Column({ name: 'assigned_user_id', nullable: true })
  assignedUserId: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ name: 'last_interaction', type: 'timestamp', nullable: true })
  lastInteraction: Date;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED'],
    default: 'ACTIVE'
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Stage, stage => stage.clientStages, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'stage_id' })
  stage: Stage;

  @ManyToOne(() => Client, client => client.clientStages)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser: User;

  @ManyToOne(() => FunnelChannel)
  @JoinColumn({ name: 'funnel_channel_id' })
  funnelChannel: FunnelChannel;
}