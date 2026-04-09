import { useRef, useState } from 'react'

import { ImageIcon, Loader2, Upload, X } from 'lucide-react'

import { Button } from 'src/components/ui/button'
import { cn } from 'src/lib/utils'

// ---------------------------------------------------------------------------
// Cloudinary upload helpers (reuses the same signed-upload endpoint as
// AvatarUpload, just with folder=products)
// ---------------------------------------------------------------------------

type SignedParams = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

async function fetchSignedParams(): Promise<SignedParams> {
  const base = process.env.REDWOOD_ENV_RWJS_API_URL ?? '/.redwood/functions'
  const res = await fetch(`${base}/uploadAvatar?folder=products`)
  if (!res.ok) throw new Error('Failed to get upload params')
  return res.json()
}

async function uploadToCloudinary(
  file: File,
  params: SignedParams
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', params.apiKey)
  formData.append('timestamp', String(params.timestamp))
  formData.append('signature', params.signature)
  formData.append('folder', params.folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return data.secure_url as string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ProductImageUploadProps = {
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
}

const ProductImageUpload = ({
  value,
  onChange,
  disabled,
}: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const params = await fetchSignedParams()
      const url = await uploadToCloudinary(file, params)
      onChange(url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="tw-flex tw-items-start tw-gap-4">
      {/* Image preview */}
      <div
        className={cn(
          'tw-relative tw-flex tw-h-24 tw-w-24 tw-shrink-0 tw-items-center tw-justify-center',
          'tw-overflow-hidden tw-rounded-lg tw-border tw-border-border tw-bg-muted'
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Product preview"
              className="tw-h-full tw-w-full tw-object-cover"
            />
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={() => onChange('')}
                className={cn(
                  'tw-absolute tw-right-0.5 tw-top-0.5 tw-flex tw-h-5 tw-w-5 tw-items-center tw-justify-center',
                  'tw-rounded-full tw-bg-destructive tw-text-destructive-foreground',
                  'tw-transition-opacity hover:tw-opacity-90'
                )}
                aria-label="Remove image"
              >
                <X className="tw-h-3 tw-w-3" />
              </button>
            )}
          </>
        ) : (
          <ImageIcon className="tw-h-8 tw-w-8 tw-text-muted-foreground/50" />
        )}
        {uploading && (
          <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-background/80">
            <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-primary" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="tw-flex tw-flex-col tw-gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="tw-hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          aria-label="Upload product image"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
          ) : (
            <Upload className="tw-h-4 tw-w-4" />
          )}
          {uploading ? 'Uploading…' : value ? 'Change Image' : 'Upload Image'}
        </Button>
        <p className="tw-text-xs tw-text-muted-foreground">
          PNG, JPG, WebP up to 5 MB
        </p>
        {error && <p className="tw-text-xs tw-text-destructive">{error}</p>}
      </div>
    </div>
  )
}

export default ProductImageUpload
