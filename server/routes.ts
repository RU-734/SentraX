import express, { Router, Request, Response } from 'express';

import authRouter from './auth'; // Import the authentication router
import assetsRouter from './assets'; // Import the assets router
import vulnerabilitiesRouter from './vulnerabilities'; // Import the vulnerabilities router
import dashboardRouter from './dashboard'; // Import the dashboard router

const router: Router = express.Router();

// Mount authentication routes
router.use('/auth', authRouter);

// Mount assets routes
router.use('/assets', assetsRouter);

// Mount vulnerabilities routes
router.use('/vulnerabilities', vulnerabilitiesRouter);

// Mount dashboard routes
router.use('/dashboard', dashboardRouter);

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
