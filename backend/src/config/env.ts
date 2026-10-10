import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/kanhaiya_store'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  
  JWT_SECRET: z.string().default('kanhaiya_store_jwt_secret_dev_key_2026'),
  ADMIN_ALLOWED_EMAILS: z.string().default('admin@kanhaiyastore.com,mauryaabhay518@gmail.com'),
  
  FIREBASE_PROJECT_ID: z.string().default('dummy-firebase-project'),
  FIREBASE_CLIENT_EMAIL: z.string().default('dummy@example.iam.gserviceaccount.com'),
  FIREBASE_PRIVATE_KEY: z.string().default('dummy-private-key'),
  
  CLOUDINARY_CLOUD_NAME: z.string().default('dummy_cloud'),
  CLOUDINARY_API_KEY: z.string().default('dummy_key'),
  CLOUDINARY_API_SECRET: z.string().default('dummy_secret'),

  STORE_NAME: z.string().default('Kanhaiya General Store'),
  STORE_PHONE: z.string().default('+919876543210'),
  STORE_WHATSAPP: z.string().default('+919876543210'),
  STORE_UPI_ID: z.string().default('kanhaiyastore@upi'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
