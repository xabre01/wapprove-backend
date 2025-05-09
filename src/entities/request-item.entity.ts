import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ItemCategory } from '../common/enums';
import { Request } from './request.entity';

@Entity('request_items')
export class RequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_id', nullable: false })
  request_id: number;

  @Column({ name: 'item_name', length: 200, nullable: false })
  item_name: string;

  @Column({ nullable: false })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  unit_price: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  total_price: number;

  @Column({ type: 'text', nullable: true })
  specifications: string;

  @Column({
    type: 'enum',
    enum: ItemCategory,
    nullable: false,
  })
  category: ItemCategory;

  @Column({ name: 'requested_delivery_date', type: 'date', nullable: true })
  requested_delivery_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Request, (request) => request.request_items)
  @JoinColumn({ name: 'request_id' })
  request: Request;
}
