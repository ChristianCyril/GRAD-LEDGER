// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Load test environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Set a longer timeout for database operations
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}
