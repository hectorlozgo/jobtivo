import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/icon.svg"
      alt=""
      width={44}
      height={44}
      draggable={false}
      className={cn(
        'size-11 rounded-2xl object-cover shadow-[0_8px_24px_-10px_oklch(0.2_0.05_250/0.5)]',
        className
      )}
    />
  )
}
