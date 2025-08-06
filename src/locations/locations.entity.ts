import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Location {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
