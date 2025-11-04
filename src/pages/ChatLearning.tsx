import KnowledgeBaseEditor from "@/components/chat/KnowledgeBaseEditor";

export default function ChatLearning() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <KnowledgeBaseEditor />
      </div>
    </div>
  );
}
