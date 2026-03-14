import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { recipeRouter } from './routes/recipe.js';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // explicit pre-flight for all routes
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', recipeRouter);

// Global error handler — runs when next(err) is called or an unhandled async
// error escapes a route. Must come after all routes.
// CORS headers are set explicitly here so they are present even on error responses.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  res.header('Access-Control-Allow-Origin', '*');
  const message = err?.message ?? String(err);
  console.error('[unhandled]', message);
  res.status(500).json({ success: false, error: message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
