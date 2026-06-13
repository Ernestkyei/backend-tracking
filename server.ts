import 'dotenv/config';
import { app } from './app';
import db from './config/database';

const PORT = process.env.PORT;

if (!PORT) {
  console.error('ERROR: PORT is not defined in .env file');
  process.exit(1);
}

// Function to start server with database check
async function startServer() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    console.error('Please check your DATABASE_URL in .env file');
    process.exit(1); // Exit if database is not connected
  }
}

startServer();