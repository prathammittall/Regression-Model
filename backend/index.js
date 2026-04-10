import app from './app.js';
import dotenv from 'dotenv';
import { initializeDatabase } from './services/storageService.js';

dotenv.config();

const PORT = process.env.PORT || 8001;

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Backend API listening on http://localhost:${PORT}`);
      console.log(`🔗 Proxying AI model at: ${process.env.AI_MODEL_URL || 'http://localhost:8000'}`);
      console.log(`💾 Storing responses in: ./data/responses.db`);
    });
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

startServer();
