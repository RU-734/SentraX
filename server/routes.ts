import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

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
