'use strict';

import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.send({
        success: true
    })
});

export default router;
