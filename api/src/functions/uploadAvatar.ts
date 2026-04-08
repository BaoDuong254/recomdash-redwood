import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import { getSignedUploadParams } from 'src/lib/cloudinary'
import { logger } from 'src/lib/logger'

/**
 * GET /uploadAvatar?folder=avatars
 *
 * Returns signed Cloudinary upload parameters so the browser can POST
 * a file directly to Cloudinary without routing it through this server.
 *
 * Response:
 *   { cloudName, apiKey, timestamp, signature, folder }
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const folder = (event.queryStringParameters?.folder as string) ?? 'avatars'
    const params = getSignedUploadParams(folder)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(params),
    }
  } catch (err) {
    logger.error({ err }, 'Failed to generate Cloudinary signed params')
    return { statusCode: 500, body: 'Internal Server Error' }
  }
}
