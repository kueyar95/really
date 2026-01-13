import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Channel } from '../../channels/persistence/entities/channel.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { FunnelChannel } from './funnel-channel.entity';

@Entity('funnels')
export class Funnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Company, company => company.funnels)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => FunnelChannel, funnelChannel => funnelChannel.funnel)
  funnelChannels: FunnelChannel[];

  @OneToMany(() => Stage, stage => stage.funnel)
  stages: Stage[];

  // Getter virtual para obtener los canales
  channels?: Channel[];
}
