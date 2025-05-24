import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import routes from './routes'; // We'll create this next

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001; // Default to 3001 if .env is not set

app.use(express.json()); // Middleware to parse JSON bodies

// Mount the routes
app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app; // Export for potential testing or programmatic use
