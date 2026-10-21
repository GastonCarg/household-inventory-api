import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from '../locations/locations.entity';
import { Unit } from '../products/units';

@Entity('product_catalog')
export class ProductCatalog {
  @PrimaryGeneratedColumn()
  id: string;

  @Index({ unique: true, where: '"barcode" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  @Column()
  title: string;

  @Index()
  @Column({ name: 'normalized_title' })
  normalizedTitle: string;

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_location' })
  defaultLocation: Location | null;

  @Column({ name: 'shelf_life_days', type: 'int', nullable: true })
  shelfLifeDays: number | null;

  @Column({ name: 'default_unit', type: 'varchar', length: 8, nullable: true })
  defaultUnit: Unit | null;

  @Column({ name: 'times_used', type: 'int', default: 0 })
  timesUsed: number;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
