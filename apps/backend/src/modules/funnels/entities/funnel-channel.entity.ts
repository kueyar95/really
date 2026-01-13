import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Funnel } from './funnel.entity';
import { Channel } from '../../channels/persistence/entities/channel.entity';

@Entity('funnel_channels')
export class FunnelChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'funnel_id', nullable: true })
  funnelId: string;

  @Column({ name: 'channel_id', nullable: false })
  channelId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Funnel, funnel => funnel.funnelChannels)
  @JoinColumn({ name: 'funnel_id' })
  funnel: Funnel;

  @ManyToOne(() => Channel, channel => channel.funnelChannels, { eager: true })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;
}