import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Recipe routes will be mounted here by Plan 04
// import recipeRouter from './routes/recipe.js';
// app.use('/api', recipeRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
