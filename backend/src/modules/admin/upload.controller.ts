import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadImageBuffer, deleteCloudinaryImage, cloudinary } from '../../config/cloudinary';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/apiResponse';
import { BadRequestError } from '../../utils/errors';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WEBP, AVIF`));
    }
  },
});

function validateUploadFolder(folder?: string): string {
  const targetFolder = (folder as string) || 'kanhaiya_store/products';
  if (!targetFolder.startsWith('kanhaiya_store/') || targetFolder.includes('..')) {
    throw new BadRequestError('Invalid folder. Uploads are strictly restricted to the kanhaiya_store namespace.');
  }
  return targetFolder;
}

function validatePublicId(publicId?: string): string {
  if (!publicId) {
    throw new BadRequestError('Cloudinary public ID is required');
  }
  const decoded = decodeURIComponent(publicId).trim();
  if (!decoded.startsWith('kanhaiya_store/') || decoded.includes('..')) {
    throw new BadRequestError(
      'Unauthorized: Deletion is strictly restricted to assets within the kanhaiya_store namespace.'
    );
  }
  return decoded;
}

export async function uploadSingleImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new BadRequestError('No image file provided in request (field: "image")');
    }

    const folder = validateUploadFolder(req.body.folder);
    const result = await uploadImageBuffer(req.file.buffer, folder);

    sendSuccess(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
      'Image uploaded successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function uploadMultipleImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new BadRequestError('No image files provided in request (field: "images")');
    }

    const folder = validateUploadFolder(req.body.folder);
    const uploads = await Promise.all(
      files.map((file) => uploadImageBuffer(file.buffer, folder))
    );

    const data = uploads.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    }));

    sendSuccess(res, data, `${data.length} images uploaded successfully`, 201);
  } catch (error) {
    next(error);
  }
}

export async function getSignedUploadParams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const folder = validateUploadFolder(req.body.folder);
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

    sendSuccess(
      res,
      {
        signature,
        timestamp,
        folder,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
      },
      'Signed upload parameters generated'
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const decodedPublicId = validatePublicId(req.params.publicId);
    await deleteCloudinaryImage(decodedPublicId);

    sendSuccess(res, { publicId: decodedPublicId, deleted: true }, 'Image deleted successfully');
  } catch (error) {
    next(error);
  }
}
