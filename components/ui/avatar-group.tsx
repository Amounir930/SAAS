import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  limit?: number
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, limit = 3, children, ...props }, ref) => {
    const avatars = React.Children.toArray(children)
    const totalAvatars = avatars.length
    const displayedAvatars = avatars.slice(0, limit)
    const remaining = totalAvatars - limit

    return (
      <div
        ref={ref}
        className={cn("flex -space-x-2 overflow-hidden", className)}
        {...props}
      >
        {displayedAvatars}
        {remaining > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
            +{remaining}
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

export { AvatarGroup, Avatar, AvatarFallback, AvatarImage }
