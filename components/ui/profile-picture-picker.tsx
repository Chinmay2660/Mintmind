'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImageIcon, Trash2, User, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import {
  CROP_OUTPUT_SIZE,
  CROP_VIEW_SIZE,
  cropImageToDataUrl,
  getCoverScale,
} from '@/lib/utils/cropImage'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

interface ProfilePicturePickerProps {
  value: string
  onChange: (value: string) => void
  name?: string
  className?: string
}

function ImageCropContent({
  imageSrc,
  onComplete,
  onCancel,
  isMobile,
}: {
  imageSrc: string
  onComplete: (dataUrl: string) => void
  onCancel: () => void
  isMobile: boolean
}) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    setNaturalSize({ w: 0, h: 0 })
  }, [imageSrc])

  const coverScale =
    naturalSize.w > 0 ? getCoverScale(naturalSize.w, naturalSize.h, CROP_VIEW_SIZE) : 1
  const displayScale = coverScale * zoom
  const displayW = naturalSize.w * displayScale
  const displayH = naturalSize.h * displayScale
  const displayLeft = CROP_VIEW_SIZE / 2 - displayW / 2 + position.x
  const displayTop = CROP_VIEW_SIZE / 2 - displayH / 2 + position.y

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    setPosition({
      x: dragStart.current.posX + e.clientX - dragStart.current.x,
      y: dragStart.current.posY + e.clientY - dragStart.current.y,
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleApply = async () => {
    const img = imageRef.current
    if (!img?.complete || !img.naturalWidth) return
    try {
      setProcessing(true)
      const dataUrl = cropImageToDataUrl(img, CROP_VIEW_SIZE, CROP_OUTPUT_SIZE, zoom, position)
      onComplete(dataUrl)
    } catch {
      toast.error('Failed to crop image')
    } finally {
      setProcessing(false)
    }
  }

  const hint = isMobile ? 'Drag to reposition · Slide to zoom' : 'Drag to reposition · Use slider to zoom'

  return (
    <>
      <div
        className={cn(
          'relative mx-auto overflow-hidden rounded-2xl bg-muted touch-none select-none',
          dragging && 'cursor-grabbing',
          !dragging && 'cursor-grab'
        )}
        style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Crop preview"
          className="pointer-events-none absolute max-w-none"
          style={{
            width: displayW || undefined,
            height: displayH || undefined,
            left: displayLeft,
            top: displayTop,
          }}
          onLoad={(e) => {
            const img = e.currentTarget
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
          }}
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle ${CROP_VIEW_SIZE / 2}px at center, transparent ${CROP_VIEW_SIZE / 2 - 1}px, rgba(0,0,0,0.5) ${CROP_VIEW_SIZE / 2}px)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
          style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
          aria-hidden
        />
      </div>

      <div className="flex items-center gap-3 px-1">
        <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-2 w-full accent-primary"
          aria-label="Zoom"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">{hint}</p>

      {isMobile ? (
        <SheetFooter className="gap-2 sm:flex-col">
          <Button type="button" className="w-full" onClick={handleApply} disabled={processing}>
            {processing ? 'Applying…' : 'Use photo'}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </SheetFooter>
      ) : (
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={processing}>
            {processing ? 'Applying…' : 'Apply'}
          </Button>
        </DialogFooter>
      )}
    </>
  )
}

function ImageCropOverlay({
  open,
  onOpenChange,
  imageSrc,
  onComplete,
  isMobile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onComplete: (dataUrl: string) => void
  isMobile: boolean
}) {
  const handleComplete = (dataUrl: string) => {
    onComplete(dataUrl)
    onOpenChange(false)
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[min(92dvh,640px)] rounded-t-3xl overflow-y-auto pb-8 safe-area-inset-bottom gap-4"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl font-bold">Adjust photo</SheetTitle>
          </SheetHeader>
          <ImageCropContent
            imageSrc={imageSrc}
            onComplete={handleComplete}
            onCancel={() => onOpenChange(false)}
            isMobile
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle>Crop profile photo</DialogTitle>
        </DialogHeader>
        <ImageCropContent
          imageSrc={imageSrc}
          onComplete={handleComplete}
          onCancel={() => onOpenChange(false)}
          isMobile={false}
        />
      </DialogContent>
    </Dialog>
  )
}

export function ProfilePicturePicker({ value, onChange, name, className }: ProfilePicturePickerProps) {
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Image must be smaller than 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setCropOpen(true)
    }
    reader.onerror = () => toast.error('Failed to read image')
    reader.readAsDataURL(file)
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-foreground">Profile picture</label>

      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10">
          {value ? (
            <img src={value} alt={name || 'Profile'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isMobile ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Photo library
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Choose photo
            </Button>
          )}
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-300"
              onClick={() => onChange('')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onInputChange}
        aria-label="Choose photo from library"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="user"
        className="hidden"
        onChange={onInputChange}
        aria-label="Take photo with camera"
      />
      <p className="text-xs text-muted-foreground">
        {isMobile
          ? 'Take a selfie or pick from your library · JPG, PNG or WebP · max 5 MB'
          : 'JPG, PNG or WebP · max 5 MB · cropped to a circle'}
      </p>

      {cropSrc && (
        <ImageCropOverlay
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          isMobile={isMobile}
          onComplete={(dataUrl) => {
            onChange(dataUrl)
            setCropSrc(null)
          }}
        />
      )}
    </div>
  )
}
