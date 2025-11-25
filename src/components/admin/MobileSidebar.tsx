import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Mail, Send, FileText, Trash2, AlertTriangle, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmailStats {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
  starred: number;
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  stats: EmailStats;
  onRefresh: () => void;
  loading: boolean;
}

export function MobileSidebar({
  isOpen,
  onClose,
  activeFolder,
  onFolderChange,
  stats,
  onRefresh,
  loading
}: MobileSidebarProps) {
  const folders = [
    { id: 'inbox', name: 'Boîte de réception', icon: Mail, count: stats.inbox },
    { id: 'starred', name: 'Étoilés', icon: Star, count: stats.starred },
    { id: 'sent', name: 'Envoyés', icon: Send, count: stats.sent },
    { id: 'drafts', name: 'Brouillons', icon: FileText, count: stats.drafts },
    { id: 'spam', name: 'Spam', icon: AlertTriangle, count: stats.spam },
    { id: 'trash', name: 'Corbeille', icon: Trash2, count: stats.trash },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Email Manager</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {folders.map((folder) => {
              const Icon = folder.icon;
              return (
                <Button
                  key={folder.id}
                  variant={activeFolder === folder.id ? "secondary" : "ghost"}
                  className="w-full justify-between mb-1"
                  onClick={() => {
                    onFolderChange(folder.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {folder.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
