import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, FileText, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface SearchResult {
  id: string;
  label: string;
  type: string;
  metadata: any;
}

export function AdminSmartSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async (value: string) => {
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("admin_smart_search", {
        term: value,
      });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="w-4 h-4" />;
      case "log":
        return <FileText className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "user":
        return "default";
      case "log":
        return "secondary";
      case "email":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={t.adminComponents.smartSearch.placeholder}
          value={query}
          onChange={(e) => search(e.target.value)}
          className="pl-10"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t.adminComponents.smartSearch.results} {results.length > 0 && `(${results.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-center text-muted-foreground py-8">
              {t.adminComponents.smartSearch.minChars}
            </p>
          ) : results.length === 0 && !searching ? (
            <p className="text-center text-muted-foreground py-8">{t.adminComponents.smartSearch.noResults}</p>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getTypeBadgeColor(result.type)} className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                    <div className="font-semibold truncate">{result.label}</div>
                    {result.metadata && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.type === "user" && (
                          <>
                            {result.metadata.name && <span>{result.metadata.name} • </span>}
                            <span className="capitalize">{result.metadata.status}</span>
                          </>
                        )}
                        {result.type === "log" && (
                          <>
                            <span>{result.metadata.function}</span> •{" "}
                            <span className="capitalize">{result.metadata.type}</span>
                          </>
                        )}
                        {result.type === "email" && (
                          <>
                            <span>{result.metadata.from}</span> •{" "}
                            <span className="capitalize">{result.metadata.status}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
