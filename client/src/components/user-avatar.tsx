import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface UserAvatarProps {
  className?: string;
  size?: number;
}

export default function UserAvatar({ className = "", size = 32 }: UserAvatarProps) {
  const { user } = useAuth();

  // Calculate size classes based on the size prop
  const sizeClass = size <= 16 ? "w-4 h-4" : 
                   size <= 24 ? "w-6 h-6" : 
                   size <= 32 ? "w-8 h-8" : 
                   size <= 40 ? "w-10 h-10" : 
                   size <= 48 ? "w-12 h-12" :
                   size <= 56 ? "w-14 h-14" : "w-16 h-16";

  // Get user initials from name
  const getInitials = (name: string) => {
    if (!name) return "U";
    const nameParts = name.split(" ").filter(Boolean);
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const userInitials = user?.name ? getInitials(user.name) : "U";

  return (
    <Avatar className={`${sizeClass} ${className}`}>
      {user?.profileImageUrl && (
        <AvatarImage 
          src={user.profileImageUrl} 
          alt={user?.name || "Usuário"} 
          className="object-cover"
          onError={(e) => {
            console.log("Avatar image failed to load:", user.profileImageUrl);
            // Hide the image element on error so fallback shows
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {userInitials}
      </AvatarFallback>
    </Avatar>
  );
}