import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { Approver } from './approver.entity';
import { Request } from './request.entity';
import { Notification } from './notification.entity';
import { Account } from './account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: false,
  })
  role: UserRole;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ length: 100, unique: true, nullable: false })
  email: string;

  @Column({ length: 20, nullable: true })
  phone_number: string;

  @Column({ default: true, nullable: false })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @OneToOne(() => Account, (account) => account.user)
  account: Account;

  @OneToMany(() => Approver, (approver) => approver.user)
  approvers: Approver[];

  @OneToMany(() => Request, (request) => request.user)
  requests: Request[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
