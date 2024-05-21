import fs from "fs"
import { Response } from "express";
import { DataSource } from "typeorm";
import { UploadFilesEntity } from "../entities/UploadFilesEntity.interface";
import { ReportEntity } from "../entities/ReportEntitiy.interface";

export class DatabaseUploadService {
  private reportRepository;
  private uploadFileRepository;


  constructor(dataSource: DataSource) {
    this.uploadFileRepository = dataSource.getRepository(UploadFilesEntity);
    this.reportRepository = dataSource.getRepository(ReportEntity);
  }

  async uploadFileDataToDatabase(embeddings: any, FilePath: string, upload_id: number, fileType, extractedText: string ) {
    
    console.log(embeddings, FilePath, upload_id, fileType, extractedText)

    
    try{


      let uploadEntity = await this.uploadFileRepository.findOne({ where: { upload_id: upload_id} })

      let reportEntity = await this.reportRepository.findOne({ where: { 
          text: extractedText, 
          embeddings: embeddings,

        } });

      // Create ReportEntity & Severity Entity
      if (!reportEntity) {

        // Then create and save reportEntity
        reportEntity = this.reportRepository.create({
          fileType: fileType,
          timestamp: new Date(),
          text: extractedText,
          upload: uploadEntity,
          embeddings: JSON.stringify(embeddings),
        });

        await this.reportRepository.save(reportEntity);

      } else {        
        if (FilePath !== null && fileType.includes("pdf")) {
        fs.unlink(FilePath, (err) => {
          if (err) {
            console.error("Error deleting file Database Class:", err);
          }
        })
        };
      }
      return { report_id: reportEntity.id };
    } catch (error) {
      let uploadEntity = await this.uploadFileRepository.findOne({ where: { upload_id: upload_id} })
      uploadEntity.processingStatus = "failed"; // or use your enum if applicable
      await this.uploadFileRepository.save(uploadEntity); // Save the updated entity
      console.error('Error Uploading New Data into Database:', error);
      return { success: false, message: 'Error Uploading New Data into Database' };
    }
  }

  returnFormatedDate(date: string) {

    let dateObj = new Date(date)

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0'); // January is 0!
    const dd = String(dateObj.getDate()).padStart(2, '0');

    const formattedDate = `${yyyy}-${mm}-${dd}`;

    return formattedDate
  }

}