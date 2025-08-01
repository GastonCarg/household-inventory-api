import {
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  location: string;

  @Column()
  expireDate: string;

  @Column()
  quantity: number;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
