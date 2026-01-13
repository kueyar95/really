import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Channel } from '../../channels/persistence/entities/channel.entity';
import { Funnel } from '../../funnels/entities/funnel.entity';
import { AiBot } from '../../ai-bots/entities/ai-bot.entity';
import { Client } from '../../clients/entities/client.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @OneToMany(() => User, user => user.company)
  users: User[];

  @OneToMany(() => Channel, channel => channel.company)
  channels: Channel[];

  @OneToMany(() => Funnel, funnel => funnel.company)
  funnels: Funnel[];

  @OneToMany(() => AiBot, aiBot => aiBot.company)
  aiBots: AiBot[];

  @OneToMany(() => Client, client => client.company)
  clients: Client[];
}
