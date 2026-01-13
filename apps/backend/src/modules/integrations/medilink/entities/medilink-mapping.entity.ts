import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum MedilinkMappingKind {
  PATIENT = 'patient',
  APPOINTMENT = 'appointment',
  PROFESSIONAL = 'professional',
  BRANCH = 'branch',
  CHAIR = 'chair',
  ATTENTION = 'attention',
}

@Entity('medilink_mappings')
@Unique(['companyId', 'kind', 'externalId'])
@Index('idx_medilink_mapping_company', ['companyId'])
@Index('idx_medilink_mapping_internal', ['companyId', 'kind', 'internalId'])
export class MedilinkMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({
    type: 'enum',
    enum: MedilinkMappingKind,
  })
  kind: MedilinkMappingKind;

  @Column({ name: 'internal_id' })
  internalId: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column({ name: 'external_data', type: 'jsonb', nullable: true })
  externalData: Record<string, any>;

  @Column({ name: 'updated_external_at', type: 'timestamp', nullable: true })
  updatedExternalAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
