import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MedilinkIntegrationStatus {
  CONNECTED = 'connected',
  INVALID_TOKEN = 'invalid_token',
  REVOKED = 'revoked',
}

@Entity('medilink_integrations')
@Index('idx_medilink_integration_company', ['companyId'])
export class MedilinkIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ name: 'base_url' })
  baseUrl: string;

  @Column({ name: 'token_ciphertext', type: 'text' })
  tokenCiphertext: string;

  @Column({
    type: 'enum',
    enum: MedilinkIntegrationStatus,
    default: MedilinkIntegrationStatus.CONNECTED,
  })
  status: MedilinkIntegrationStatus;

  @Column({ name: 'rate_limit_per_min', type: 'int', default: 20 })
  rateLimitPerMin: number;

  @Column({ name: 'last_success_at', type: 'timestamp', nullable: true })
  lastSuccessAt: Date;

  @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
  lastErrorAt: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  @Column({ name: 'sync_enabled', type: 'boolean', default: true })
  syncEnabled: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
