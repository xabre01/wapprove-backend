import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Approver } from './approver.entity';
import { Request } from './request.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  approval_layers: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @OneToMany(() => Approver, (approver) => approver.department)
  approvers: Approver[];

  @OneToMany(() => Request, (request) => request.department)
  requests: Request[];
}
