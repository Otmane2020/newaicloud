interface GoogleSearchPreviewProps {
  title: string;
  description: string;
  url: string;
  compact?: boolean;
}

export function GoogleSearchPreview({
  title,
  description,
  url,
  compact = false,
}: GoogleSearchPreviewProps) {
  const titleLength = title.length;
  const descLength = description.length;

  // Truncate for display like Google does
  const displayTitle = titleLength > 60 ? title.substring(0, 60) + "..." : title;
  const displayDesc = descLength > 155 ? description.substring(0, 155) + "..." : description;

  // Extract domain from URL - if it's still example.com or myshopify.com, try to get the real domain
  let domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  
  // If domain contains myshopify.com or is example.com, it needs to be replaced
  // The actual domain should be passed via the url prop from the parent component

  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 bg-background rounded-md border border-border/50 w-full">
        {/* Google Logo */}
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>

        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Domain */}
          <div className="text-xs text-[#5f6368] dark:text-muted-foreground truncate">
            {domain}
          </div>

          {/* Title */}
          <h3 className="text-sm leading-tight text-[#1a0dab] dark:text-blue-400 font-normal line-clamp-1">
            {displayTitle}
          </h3>

          {/* Description */}
          <p className="text-xs text-[#4d5156] dark:text-muted-foreground leading-snug line-clamp-2">
            {displayDesc}
          </p>
        </div>
      </div>
    );
  }

  // Full preview mode (for dialogs)
  return (
    <div className="p-6 bg-background border border-border/50 rounded-lg">
      <div className="flex items-start gap-3">
        {/* Google Logo */}
        <svg className="w-6 h-6 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>

        <div className="flex-1 space-y-2">
          {/* URL breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#202124] dark:text-green-500">{domain}</span>
          </div>

          {/* Title */}
          <h3 className="text-[20px] leading-[1.3] text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer font-normal">
            {displayTitle}
          </h3>

          {/* Description */}
          <p className="text-sm text-[#4d5156] dark:text-muted-foreground leading-[1.58]">
            {displayDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
