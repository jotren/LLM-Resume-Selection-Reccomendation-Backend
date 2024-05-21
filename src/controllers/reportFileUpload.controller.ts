import { Request, Response, NextFunction } from "express";
import { FileProcessingService } from "../services/FileProcessing.service";
import { dataSource } from "../data-source";

const apiUrl: string = process.env.API_URL;
const fileService = new FileProcessingService(dataSource, apiUrl)

async function processUploadedFile(req: Request, res: Response, next: NextFunction) {
    try {
        const { upload_id } = req.params;
        const result = await fileService.processAndMoveFile(Number(upload_id));
        console.log(result)
        
        // Check if the processing was successful
        if (result.success) {
            // Assuming `result.report_id` is the expected successful output
            res.status(200).json({ success: true });
        } else {
            // Here, we handle the failure case by using the message from `processAndMoveFile`
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error) {
        // This catch block is for catching unexpected errors in the try block
        // unrelated to the `processAndMoveFile` logic directly.
        res.status(500).json({ success: false, message: error.message });
    }
}



async function storeUploadedFile(req: Request, res: Response, next: NextFunction) {

    console.log('Function Called')

    try {
        const uploadedFiles = req.files as Express.Multer.File[];
        if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
        }

        const uploadResults = await fileService.uploadFileInfoIntoBackend(uploadedFiles);
        res.status(200).json(uploadResults);
    } catch (error) {
        next(error);
    }
    }

async function deleteUnScannedFile(req: Request, res: Response, next: NextFunction) {
    const { upload_id } = req.params;
    try {
        const message = await fileService.removeUploadedFile(Number(upload_id));
        res.status(200).send(message) ;
    } catch (err) {
        console.error(err);
        res.status(500).send('Unable to delete uploaded files: ' + err.message);
    }
    }

    async function checkUploadStatusBulk(req: Request, res: Response, next: NextFunction) {
        try {
            const uploadIds = req.body.upload_ids; 
            const statuses = await fileService.checkDatabaseForUploadStatusBulk(uploadIds);
            res.status(200).json(statuses);
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Unable to assess status of uploaded files: ' + err.message });
        }
    }

    
export default {
    deleteUnScannedFile,
    storeUploadedFile,
    processUploadedFile,
    checkUploadStatusBulk
}