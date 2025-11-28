import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Bug, Info, Server, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/language";

interface LogEvent {
  id: string;
  type: string;
  message: string;
  created_at: string;
  function_name: string;
  user_id: string | null;
  metadata: any;
}

export function SystemEventLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterType]);

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (!error && data) {
      setLogs(data);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.function_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "error":
        return <Bug className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      case "debug":
        return <Server className="w-5 h-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t.adminComponents.eventLogs.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-md border bg-background"
        >
          <option value="all">{t.adminComponents.eventLogs.allTypes}</option>
          <option value="error">{t.adminComponents.eventLogs.errors}</option>
          <option value="warning">{t.adminComponents.eventLogs.warnings}</option>
          <option value="info">{t.adminComponents.eventLogs.info}</option>
          <option value="debug">{t.adminComponents.eventLogs.debug}</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t.adminComponents.eventLogs.title} ({filteredLogs.length} / {logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.adminComponents.eventLogs.noLogs}</p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getLogIcon(log.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.function_name}
                        </Badge>
                        <Badge
                          variant={
                            log.type === "error"
                              ? "destructive"
                              : log.type === "warning"
                              ? "secondary"
                              : "default"
                          }
                          className="text-xs"
                        >
                          {log.type}
                        </Badge>
                      </div>
                      <p className="text-sm break-words">{log.message}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
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
