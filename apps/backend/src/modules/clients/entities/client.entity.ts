import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ClientStage } from './client-stage.entity';
import { ChatHistory } from './chat-history.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('clients')
@Unique(['phone', 'companyId'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Company, company => company.clients)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => ClientStage, clientStage => clientStage.client)
  clientStages: ClientStage[];

  @OneToMany(() => ChatHistory, chatHistory => chatHistory.client)
  chatHistories: ChatHistory[];
}
