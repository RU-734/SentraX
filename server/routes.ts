import express, { Router, Request, Response } from 'express';

import authRouter from './auth'; // Import the authentication router

const router: Router = express.Router();

// Mount authentication routes
router.use('/auth', authRouter);

// Example API route
router.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from the API!' });
});

// You can add more routes here as the application grows
// For example:
// router.post('/data', (req: Request, res: Response) => {
//   // Handle POST request
//   res.status(201).json({ message: 'Data received', data: req.body });
// });

export default router;
