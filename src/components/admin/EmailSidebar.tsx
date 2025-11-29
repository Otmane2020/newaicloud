import { Mail, Inbox, Send, FileText, Trash2, AlertOctagon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EmailStats {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
  unreadInbox?: number;
  unreadSent?: number;
  unreadDrafts?: number;
  unreadTrash?: number;
  unreadSpam?: number;
}

interface EmailSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  stats: EmailStats;
  onRefresh: () => void;
  loading?: boolean;
}

export function EmailSidebar({ activeFolder, onFolderChange, stats, onRefresh, loading }: EmailSidebarProps) {
  const folders = [
    { icon: Inbox, label: "Boîte de réception", id: "inbox", count: stats.inbox, color: "text-blue-600" },
    { icon: Send, label: "Envoyés", id: "sent", count: stats.sent, color: "text-green-600" },
    { icon: FileText, label: "Brouillons", id: "drafts", count: stats.drafts, color: "text-yellow-600" },
    { icon: Trash2, label: "Corbeille", id: "trash", count: stats.trash, color: "text-gray-600" },
    { icon: AlertOctagon, label: "Spam", id: "spam", count: stats.spam, color: "text-red-600" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">DOSSIERS</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className="h-7 w-7"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
      {folders.map((folder) => {
        const Icon = folder.icon;
        const isActive = activeFolder === folder.id;
        const unreadKey = `unread${folder.id.charAt(0).toUpperCase() + folder.id.slice(1)}` as keyof EmailStats;
        // Les emails envoyés n'ont pas de statut "non lu"
        const unreadCount = folder.id === "sent" ? 0 : (stats[unreadKey] || 0);
        const totalCount = folder.count;

        return (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground font-medium shadow-sm"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", folder.color)} />
              <span className="text-sm">{folder.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
              <Badge 
                variant={isActive ? "default" : "secondary"}
                className="ml-auto"
              >
                {totalCount}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
