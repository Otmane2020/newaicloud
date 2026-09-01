import BlogWorkspace from "@/pages/BlogWorkspace";

export interface ArticleManagementRef {
  optimizeAllArticles: () => Promise<void>;
}

export interface ArticleManagementProps {
  onOptimizationComplete?: () => void;
}

export default function ArticleManagement(_props: ArticleManagementProps) {
  return <BlogWorkspace />;
}
