import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import axios from "axios";
import { UploadFilesEntity } from '../entities/UploadFilesEntity.interface';
import { DatabaseUploadService } from './DatabaseUpload.service';
import FormData from 'form-data';
import { dataSource } from '../data-source';
import pdf from 'pdf-parse';

import murmurhash from 'murmurhash';
import { ReportEntity } from '../entities/ReportEntitiy.interface';

const uploadFileDataToDatabase = new DatabaseUploadService(dataSource)

export class FileProcessingService {
  private uploadFileRepository;
  private apiUrl;
  private reportRepository;

  constructor(dataSource: DataSource, apiUrl: string) {
    this.uploadFileRepository = dataSource.getRepository(UploadFilesEntity);
    this.reportRepository = dataSource.getRepository(ReportEntity)
    this.apiUrl = apiUrl;
  }

  async processAndMoveFile(upload_id: number) {
    try {

    console.log(this.apiUrl)

    const uploadEntity = await this.uploadFileRepository.findOne({
      where: { upload_id },
      select: ['fileName', 'filePath', 'fileType'],
    });

    if (!uploadEntity) {
      throw new Error(`Upload with ID ${upload_id} not found.`);
    }

    const { filePath, fileName, fileType } = uploadEntity;
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${fileName}`);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: fileName,
    });

    // First, get the directory of the current file
    const fileDir = path.dirname(filePath);

    // Move one level up from the current directory
    const parentDir = path.resolve(fileDir, '..');

    // Construct the new path in the 'scans' directory
    const newFilePath = path.join(parentDir, 'scans', fileName);

    let embeddings;
    if (fileType.includes('pdf')) {
        // Assign the value to `result` without redeclaring it.
        const extractedText = await this.extractTextFromPDF(filePath);

        embeddings = await this.sendTextToPython(extractedText);

        console.dir(embeddings, {depth: null})
        await uploadFileDataToDatabase.uploadFileDataToDatabase(embeddings, newFilePath, upload_id, fileType, extractedText);
        if (!embeddings) {
          throw new Error('File API Not Responsive');
        }
    }

    try {
      
      await fs.promises.rename(filePath, newFilePath);
    } catch (error) {
      console.log(error)
    }
    await this.uploadFileRepository.update({ upload_id }, { filePath: newFilePath });
    return { success: true} 
      } catch (error) {
        let uploadEntity = await this.uploadFileRepository.findOne({ where: { upload_id: upload_id} })
        uploadEntity.processingStatus = "failed";
        await this.uploadFileRepository.save(uploadEntity); // Save the updated entity
        console.error('Error processing file:', error);
        return { success: false, message: error.message };
    }
  }    
    
    async uploadFileInfoIntoBackend(files: any[]) {
      const responseArray = [];
    
      for (const file of files) {
        const fileContent = await fs.promises.readFile(file.path);
        const fileHash = murmurhash.v3(fileContent.toString(), 0).toString();
    
        const uploadEntity = await this.uploadFileRepository.findOne({
          where: {
            originalFileName: file.originalname,
            fileHash: fileHash,
          },
        });
    
        if (uploadEntity) {
          // Existing file handling logic
          await fs.promises.unlink(file.path);
          const reportEntity = await this.reportRepository.findOne({
            where: { upload: uploadEntity },
            select: ['id'],
          });
          responseArray.push({
            originalFileName: file.originalname,
            report_id: reportEntity?.id,
            upload_id: null,
            duplicate: true,
          });
        } else {

          const newUploadEntity = this.uploadFileRepository.create({
            filePath: file.path,
            fileName: file.filename,
            originalFileName: file.originalname,
            fileHash: fileHash,
            processingStatus: "uploaded",
            fileType: file.mimetype
          });
    
          await this.uploadFileRepository.save(newUploadEntity);
          responseArray.push({
            originalFileName: file.originalname,
            upload_id: newUploadEntity.upload_id,
            duplicate: false,            
          });
        }
      }
      return responseArray;
    }
  
  async removeUploadedFile(upload_id: number): Promise<string> {
    const uploadEntities = await this.uploadFileRepository.find({
      where: { upload_id }
    });

    if (uploadEntities.length === 0) {
      throw new Error(`No upload entities found with upload_id ${upload_id}.`);
    }


    const fileDeletionPromises = uploadEntities.map(async (uploadEntity) => {
      try {
        await fs.promises.unlink(uploadEntity.filePath);
        await this.uploadFileRepository.delete({ upload_id: uploadEntity.upload_id });
      } catch (err) {
        console.error(`Failed to delete file at ${uploadEntity.filePath}:`, err.message);
      }
    });

    // Execute all promises (file deletions) in parallel
    await Promise.all(fileDeletionPromises);

    return `Files with upload_id ${upload_id} deleted successfully!`;
  }

  async checkDatabaseForUploadStatusBulk(uploadIds: number[]) {
    try {
        const uploadEntities = await this.uploadFileRepository.findByIds(uploadIds, {
            select: ["upload_id", "processingStatus"]
        });

        if (!uploadEntities || uploadEntities.length === 0) {
            return { success: false, message: "Uploads not found." };
        }

        // Transforming entities to a more friendly structure
        const statuses = uploadEntities.map(entity => ({
            upload_id: entity.upload_id,
            processingStatus: entity.processingStatus
        }));

        return { success: true, statuses: statuses };

    } catch (error) {
        console.error('Error checking upload statuses:', error);
        return { success: false, message: 'Error checking upload statuses.' };
    }
}

  async sendTextToPython(text) {
    try {
      // Wrap the text in the specified structure
      const postData = {
        resumes: [{ resume: text }]
      };

      // Send the structured data to the Python API
      const response = await axios.post(this.apiUrl, postData, {
        headers: { 'Content-Type': 'application/json' }
      });

      return response.data;
    } catch (error) {
      console.error('Error sending data to Python API:', error);
      throw new Error(`Python API error: ${error.message}`);
    }
  }

  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }


}

