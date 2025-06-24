import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
process.env.N8N_API_KEY = process.env.N8N_API_KEY || 'test-api-key'; 