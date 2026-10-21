import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from '../locations/locations.entity';
import { DEFAULT_UNIT, Unit } from './units';

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => Location, (location) => location.products)
  @JoinColumn({ name: 'location' })
  location: Location;

  @Column()
  expireDate: string;

  // pg returns numeric as a string; expose it as a number
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
  })
  quantity: number;

  @Column({ type: 'varchar', length: 8, default: DEFAULT_UNIT })
  unit: Unit;

  @Column({ type: 'varchar', nullable: true })
  barcode?: string | null;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
