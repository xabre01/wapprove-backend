import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', unique: true, nullable: false })
  user_id: number;

  @Column({ length: 255, nullable: false })
  password: string;

  @Column({ default: false })
  is_locked: boolean;

  @Column({ name: 'last_login', nullable: true })
  last_login: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  refresh_token: string;

  // Relations
  @OneToOne(() => User, (user) => user.account)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
