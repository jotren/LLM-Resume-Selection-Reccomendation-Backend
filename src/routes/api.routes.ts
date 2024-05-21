import express from "express";
import { upload as multerUpload } from "../middleware/multer-pdf.middleware";
import uploadFileData from "../controllers/reportFileUpload.controller";



const router = express.Router();

const pdfLimitEnv = process.env.PDF_LIMIT;

let pdfLimit;
if (pdfLimitEnv && !isNaN(Number(pdfLimitEnv))) {
  pdfLimit = Number(pdfLimitEnv);
} else {
  console.error('PDF_LIMIT is not defined or is not a valid number.');
  process.exit(1);
}

router.post('/upload', multerUpload.array("files", pdfLimit), uploadFileData.storeUploadedFile);
router.post('/reports/:upload_id/scan', uploadFileData.processUploadedFile);

// Simple test route to check if the API is working
router.get('/test', (req, res) => {
    res.send("API is working");
  });

  export default router;

  