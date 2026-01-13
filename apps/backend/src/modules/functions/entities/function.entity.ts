import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { FunctionType, FunctionParameters, FunctionConstData } from '../core/types/function.types';

@Entity('functions')
export class Function {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({
    type: 'enum',
    enum: FunctionType
  })
  type: FunctionType;

  @Column()
  name: string;

  @Column()
  external_name: string;

  @Column('text')
  description: string;

  @Column({ name: 'activation_description', type: 'text' })
  activationDescription: string;

  // go to open ai tools
  @Column({ type: 'jsonb' })
  parameters: FunctionParameters;

  // context to execute the function in company
  @Column({ name: 'const_data', type: 'jsonb' })
  constData: FunctionConstData;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
