import { cn } from '@/lib/utils'

interface CramoIconProps {
  className?: string
  alt?: string
}

/** Cramo avatar that swaps to a dark-purple-background variant in dark mode. */
export function CramoIcon({ className, alt = 'Cramo' }: CramoIconProps) {
  return (
    <>
      <img
        src="/icons/Cramo_Icons/Cramo_Fresh_Ai_Chat_Icon.png"
        alt={alt}
        className={cn(className, 'dark:hidden')}
      />
      <img
        src="/icons/Cramo_Icons/Ai_Chat_Icon_Dark_Mode.png"
        alt={alt}
        className={cn(className, 'hidden dark:block')}
      />
    </>
  )
}
