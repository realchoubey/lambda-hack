import express, { Request, Response } from 'express';
import GetQueryData from '../../../services/GetQueryData';
const router = express.Router();

/**
 * Success Response
 * request: curl -X POST http://localhost:3000/web/avs/run-sql
 * response: {"success":true,"data":{}}
 *
 * Error Response
 * request: curl -X POST http://localhost:3000/web/avs/run-sql
 * response: {"success":false,"data":{"msg":""}}
 */
router.post('/run-sql', async (req: Request, res: Response) => {
    const requestBody = req.body;
    console.log(`\nNew Task Detected: run-sql | Request body: ${JSON.stringify(requestBody)}`);
    const response = await new GetQueryData(requestBody).perform();
    console.log(`Response: ${JSON.stringify(response)}`);
    return res.status(200).json(response)
});

export default router;
