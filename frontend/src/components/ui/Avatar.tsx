import { avatarColor, cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-24 w-24 text-3xl",
};

interface AvatarProps {
  name?: string;
  src?: string;
  id?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  className?: string;
}

export function Avatar({ name, src, id, size = "md", online, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? "avatar"} className={cn("rounded-full object-cover", SIZES[size])} />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold text-white",
            SIZES[size],
            avatarColor(id ?? name ?? "user"),
          )}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
            online ? "bg-emerald-500" : "bg-slate-300",
          )}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
