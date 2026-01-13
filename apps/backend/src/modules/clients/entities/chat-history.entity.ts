import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Channel } from '../../channels/persistence/entities/channel.entity';
import { Client } from './client.entity';

@Entity('chat_history')
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id' })
  channelId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column('text')
  message: string;

  @Column()
  direction: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'session_id', default: 'default_session' })
  sessionId: string;

  // Relaciones
  @ManyToOne(() => Channel, channel => channel.chatHistories)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @ManyToOne(() => Client, client => client.chatHistories)
  @JoinColumn({ name: 'client_id' })
  client: Client;
}