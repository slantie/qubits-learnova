import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../config/AppError';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder = 'covers' | 'lessons' | 'attachments' | 'avatars';

interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param buffer   Raw file bytes (from multer memoryStorage)
 * @param folder   Logical folder name — maps to learnova/<folder> in Cloudinary
 * @param options  Extra Cloudinary upload options (resource_type, etc.)
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    filename?: string;
  } = {},
): Promise<UploadResult> {
  const { resourceType = 'auto', filename } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder: `learnova/${folder}`,
      resource_type: resourceType,
      use_filename: !!filename,
      unique_filename: true,
    };

    if (filename) {
      uploadOptions.public_id = filename.replace(/\.[^.]+$/, ''); // strip extension
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error || !result) {
        reject(new AppError(500, 'Cloudinary upload failed', 'UPLOAD_FAILED'));
        return;
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
      });
    });

    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Non-fatal — logs on failure rather than throwing.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete asset ${publicId}:`, err);
  }
}

export { cloudinary };
