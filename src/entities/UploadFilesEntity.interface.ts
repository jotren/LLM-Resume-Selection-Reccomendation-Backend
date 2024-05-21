import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ReportEntity } from './ReportEntitiy.interface';

@Entity()
export class UploadFilesEntity {
  @PrimaryGeneratedColumn()
  upload_id: number;
  
  @Column()
  filePath: string

  @Column()
  fileName: string

  @Column()
  originalFileName: string
  
  @Column() 
  fileHash: string

  @OneToMany(() => ReportEntity, report => report.upload)
  reports: ReportEntity[];

  @Column() 
  processingStatus: string

  @Column()
  fileType: string
}
