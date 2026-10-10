import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Upload an image buffer (from Multer memory storage) to Cloudinary.
 * Automatically converts to webp, applies optimization, and places in appropriate folder.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string = 'kanhaiya_store/products'
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload returned empty response'));
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image by its public_id from Cloudinary.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<unknown> {
  return cloudinary.uploader.destroy(publicId);
}
