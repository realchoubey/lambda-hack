import express, {
    Request,
    Response,
    NextFunction
} from 'express';
import AVSRouter from './avs/index'

const router = express.Router();

router.use('/avs', AVSRouter);

export default router;
