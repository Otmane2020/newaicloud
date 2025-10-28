-- Create public blog posts table for SEO articles
CREATE TABLE IF NOT EXISTS public.public_blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  featured_image text,
  category text NOT NULL,
  author text NOT NULL DEFAULT 'NewAI Team',
  published boolean NOT NULL DEFAULT true,
  published_at timestamp with time zone,
  views integer NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'en'
);

-- Enable RLS
ALTER TABLE public.public_blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read published posts
CREATE POLICY "Anyone can view published posts"
  ON public.public_blog_posts
  FOR SELECT
  USING (published = true);

-- Create index for better performance
CREATE INDEX idx_public_blog_posts_slug ON public.public_blog_posts(slug);
CREATE INDEX idx_public_blog_posts_published ON public.public_blog_posts(published, published_at DESC);
CREATE INDEX idx_public_blog_posts_category ON public.public_blog_posts(category);
CREATE INDEX idx_public_blog_posts_language ON public.public_blog_posts(language);

-- Create trigger for updated_at
CREATE TRIGGER update_public_blog_posts_updated_at
  BEFORE UPDATE ON public.public_blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();