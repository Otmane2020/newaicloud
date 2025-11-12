import { Card, CardContent } from "@/components/ui/card";

interface GoogleSearchPreviewProps {
  title: string;
  description: string;
  url: string;
  date?: string;
  favicon?: string;
}

export function GoogleSearchPreview({
  title,
  description,
  url,
  date,
  favicon,
}: GoogleSearchPreviewProps) {
  const titleLength = title.length;
  const descLength = description.length;

  // Truncate for display like Google does
  const displayTitle = titleLength > 60 ? title.substring(0, 60) + "..." : title;
  const displayDesc = descLength > 155 ? description.substring(0, 155) + "..." : description;

  // Extract domain from URL
  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          {favicon && (
            <img src={favicon} alt="" className="w-5 h-5 mt-1 rounded" />
          )}
          <div className="flex-1 space-y-2">
            {/* URL breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-700 dark:text-green-500">{domain}</span>
              {date && (
                <span className="text-muted-foreground">• {new Date(date).toLocaleDateString('fr-FR')}</span>
              )}
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
      </CardContent>
    </Card>
  );
}
