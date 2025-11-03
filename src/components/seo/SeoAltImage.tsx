import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ProgressDialog, ResultsDialog, SyncConfirmationDialog, SuccessDialog } from './SeoWorkflowDialogs';
import { TrialLimitDialog } from '@/components/TrialLimitDialog';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { calculateAltTextScore } from '@/lib/seoQuality';
import { useTranslation } from '@/lib/language';
import { 
  Search, 
  RefreshCw, 
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle,
  Clock,
  Grid3x3,
  List,
  TrendingUp,
  Eye,
  Zap,
  ArrowRight,
  ShoppingBag,
  Package,
  FileText,
  PenSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductImage {
  id: string;
  product_id?: string;
  content_id?: string;
  content_type?: 'product' | 'collection' | 'page' | 'article' | 'homepage';
  src: string;
  alt_text: string | null;
  position: number;
  shopify_image_id: number;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  optimization_count: number;
  last_optimization_at: string | null;
  image_type: 'product' | 'content';
}

interface Product {
  id: string;
  title: string;
  vendor?: string;
  category?: string;
  image_url?: string;
  handle?: string;
  body_html?: string;
  content?: string;
}

interface ImageWithProduct extends ProductImage {
  product: Product;
}

type AltImageTab = 'all' | 'needs-alt' | 'has-alt' | 'to-sync';
type ContentTypeFilter = 'all' | 'products' | 'collections' | 'pages' | 'articles' | 'homepage';
type SeoScoreSort = 'none' | 'asc' | 'desc';
type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function SeoAltImage() {
  const [searchParams] = useSearchParams();
  const [images, setImages] = useState<ImageWithProduct[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AltImageTab>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Liste par défaut
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedImages, setOptimizedImages] = useState<ImageWithProduct[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set()); // Produits développés
  const { limits, loading: limitsLoading } = useUsageLimits();
  const { t, tf } = useTranslation();

  const IMAGES_PER_PAGE = 50;

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Fetch product images
      const { data: productImagesData, error: productError } = await supabase
        .from('product_images')
        .select(`
          *,
          product:shopify_products(id, title, vendor, category)
        `)
        .order('product_id', { ascending: true })
        .order('position', { ascending: true });

      if (productError) throw productError;

      // Fetch content images
      const { data: contentImagesData, error: contentError } = await supabase
        .from('content_images')
        .select('*')
        .order('content_id', { ascending: true })
        .order('position', { ascending: true });

      if (contentError) throw contentError;

      // Map product images
      const productImages = (productImagesData || [])
        .filter(img => img.product && img.product.id)
        .map(img => ({
          ...img,
          product: img.product,
          image_type: 'product' as const
        }));

      // Map content images and fetch their content details
      const contentImages = await Promise.all(
        (contentImagesData || []).map(async (img) => {
          let product: Product = { id: img.content_id, title: t.seo.altImage.unknownContent };

          // Fetch content details based on type
          if (img.content_type === 'collection') {
            const { data } = await supabase
              .from('shopify_collections')
              .select('id, title, handle')
              .eq('id', img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📚 ${data.title}` };
          } else if (img.content_type === 'page') {
            const { data } = await supabase
              .from('shopify_pages')
              .select('id, title, handle')
              .eq('id', img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📄 ${data.title}` };
          } else if (img.content_type === 'article') {
            const { data } = await supabase
              .from('blog_articles')
              .select('id, title')
              .eq('id', img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📰 ${data.title}` };
          } else if (img.content_type === 'homepage') {
            product = { id: img.content_id, title: `🏠 Page d'accueil` };
          }

          return {
            ...img,
            product,
            product_id: undefined,
            image_type: 'content' as const
          };
        })
      );

      // Merge and set images
      const allImages = [...productImages, ...contentImages] as ImageWithProduct[];
      setImages(allImages);
      
      // Développer tous les produits par défaut
      const allProductIds = new Set(allImages.map(img => img.product.id));
      setExpandedProducts(allProductIds);
      
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error(t.seo.altImage.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleImportContentImages = async () => {
    try {
      setImporting(true);
      
      // Get active store
      const { data: stores } = await supabase
        .from('shopify_connections')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!stores) {
        toast.error(t.seo.altImage.noStoreConnected);
        return;
      }

      // Import all types including homepage
      const { data, error } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: stores.id, types: ['collections', 'pages', 'articles', '