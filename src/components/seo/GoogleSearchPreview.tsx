import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

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

  const isTitleTooShort = titleLength < 40;
  const isTitleTooLong = titleLength > 60;
  const isDescTooShort = descLength < 120;
  const isDescTooLong = descLength > 155;

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
            <div className="flex items-start gap-2">
              <h3 className="text-[20px] leading-[1.3] text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer font-normal">
                {displayTitle}
              </h3>
              {(isTitleTooShort || isTitleTooLong) && (
                <AlertCircle className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
              )}
            </div>

            {/* Warnings for title */}
            {(isTitleTooShort || isTitleTooLong) && (
              <div className="flex gap-2 flex-wrap">
                {isTitleTooShort && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    Titre trop court ({titleLength} car.)
                  </Badge>
                )}
                {isTitleTooLong && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    Titre tronqué ({titleLength} car.)
                  </Badge>
                )}
              </div>
            )}

            {/* Description */}
            <div className="flex items-start gap-2">
              <p className="text-sm text-[#4d5156] dark:text-muted-foreground leading-[1.58]">
                {displayDesc}
              </p>
              {(isDescTooShort || isDescTooLong) && (
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              )}
            </div>

            {/* Warnings for description */}
            {(isDescTooShort || isDescTooLong) && (
              <div className="flex gap-2 flex-wrap">
                {isDescTooShort && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    Description trop courte ({descLength} car.)
                  </Badge>
                )}
                {isDescTooLong && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    Description tronquée ({descLength} car.)
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
