import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export type SignedUploadParams = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

/**
 * Generate signed upload parameters so the browser can upload directly
 * to Cloudinary without routing the binary through our server.
 */
export function getSignedUploadParams(folder = 'avatars'): SignedUploadParams {
  const timestamp = Math.round(new Date().getTime() / 1000)

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  )

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
  }
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Used when overwriting or removing user avatars.
 */
export async function deleteCloudinaryAsset(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export default cloudinary
