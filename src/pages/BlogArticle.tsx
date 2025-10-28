import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowLeft, Share2, Facebook, Twitter, Linkedin, Mail, Link2, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  published_at: string;
  featured_image: string | null;
  author: string;
  views: number;
  keywords: string[];
  meta_description: string;
}

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost();
      incrementViews();
    }
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('public_blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error) throw error;
      setPost(data);

      // Load related posts
      if (data) {
        const { data: related } = await supabase
          .from('public_blog_posts')
          .select('*')
          .eq('category', data.category)
          .eq('published', true)
          .neq('slug', slug)
          .limit(3);
        
        if (related) setRelatedPosts(related);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      const { data: currentPost } = await supabase
        .from('public_blog_posts')
        .select('views')
        .eq('slug', slug)
        .single();

      if (currentPost) {
        await supabase
          .from('public_blog_posts')
          .update({ views: currentPost.views + 1 })
          .eq('slug', slug);
      }
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || '';
    
    const urls: { [key: string]: string } = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Article URL copied to clipboard",
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Article not found</h1>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const readingTime = Math.ceil(post.content.length / 1000);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 bg-gradient-dark">
        <div className="container mx-auto px-4 py-12">
          <Button
            variant="ghost"
            onClick={() => navigate('/blog')}
            className="mb-6 text-white hover:text-white/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>

          <Badge className="mb-4 bg-primary/20">{post.category}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 max-w-4xl">
            {post.title}
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{readingTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <span>By {post.author}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Featured Image */}
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg shadow-lg mb-8"
            />
          )}

          {/* Article Content */}
          <Card className="p-8 mb-8">
            <div 
              className="prose prose-lg max-w-none article-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </Card>

          {/* Keywords */}
          {post.keywords && post.keywords.length > 0 && (
            <Card className="p-6 mb-8">
              <h3 className="font-bold mb-3">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Share Section */}
          <Card className="p-6 mb-8">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share this article
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('linkedin')}
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('email')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </Card>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Card
                    key={relatedPost.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                  >
                    {relatedPost.featured_image && (
                      <img
                        src={relatedPost.featured_image}
                        alt={relatedPost.title}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="p-4">
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {relatedPost.category}
                      </Badge>
                      <h3 className="font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 rounded-full w-12 h-12 p-0 shadow-lg"
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}

      <Footer />
    </div>
  );
};

export default BlogArticle;
