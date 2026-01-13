import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Company } from '../../../companies/entities/company.entity';
import { ChatHistory } from '../../../clients/entities/chat-history.entity';
import { FunnelChannel } from '../../../funnels/entities/funnel-channel.entity';
import { ChannelType, ChannelStatus } from '../../core/types/channel.types';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({
    type: 'enum',
    enum: ChannelType
  })
  type: ChannelType;

  @Column({ nullable: true })
  number: string;

  @Column()
  name: string;

  /**
   * Configuración de conexión del canal.
   * 
   * Para canales de tipo WHAPI_CLOUD:
   * - apiKey (opcional): API Key para compatibilidad con canales existentes
   * - whapiChannelId: ID del canal devuelto por la API Partner
   * - whapiChannelToken: Token del canal devuelto por la API Partner
   */
  @Column({ type: 'jsonb', nullable: true })
  connectionConfig: Record<string, any>;

  /**
   * Metadatos del canal.
   * 
   * Para canales de tipo WHAPI_CLOUD:
   * - projectId: ID del proyecto en Whapi.Cloud
   * - activeTill: Fecha de expiración del canal
   * - mode: Modo del canal ('trial' o 'live')
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ChannelStatus,
    default: ChannelStatus.INACTIVE
  })
  status: ChannelStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Company, company => company.channels)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => FunnelChannel, funnelChannel => funnelChannel.channel)
  funnelChannels: FunnelChannel[];

  @OneToMany(() => ChatHistory, chatHistory => chatHistory.channel)
  chatHistories: ChatHistory[];
}
