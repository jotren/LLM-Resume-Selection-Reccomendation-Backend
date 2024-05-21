// ReportEntity.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, Index, OneToMany } from 'typeorm';
import { UploadFilesEntity } from './UploadFilesEntity.interface';

@Entity()
export class ReportEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  @Column('text')
  embeddings: string;

  @Column()
  timestamp: Date;

  @Column('text')
  fileType: string;


  @ManyToOne(() => UploadFilesEntity, upload => upload.reports, {nullable: true })
  upload: UploadFilesEntity;  

  
}
