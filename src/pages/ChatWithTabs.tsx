import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Package, Brain } from "lucide-react";
import Chat from "./Chat";
import OrdersManagement from "@/components/chat/OrdersManagement";
import KnowledgeBaseEditor from "@/components/chat/KnowledgeBaseEditor";

export default function ChatWithTabs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>AI SMART Chat</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Commandes</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>Apprentissage</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <Chat />
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <OrdersManagement />
          </TabsContent>

          <TabsContent value="learning" className="mt-0">
            <KnowledgeBaseEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}