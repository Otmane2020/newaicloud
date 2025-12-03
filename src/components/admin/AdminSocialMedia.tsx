import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Facebook, Instagram, Send, Loader2, Plus, Image, Globe, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  auto_share_enabled: boolean;
}

interface AdminPost {
  id: string;
  content: string;
  image_url: string | null;
  channels: string[];
  status: string;
  facebook_post_id: string | null;
  gsc_indexed: boolean;
  created_at: string;
  published_at: string | null;
}

export function AdminSocialMedia() {
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  
  // New post form
  const [newPost, setNewPost] = useState({
    content: "",
    imageUrl: "",
    indexOnGsc: true,
    publishToFacebook: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load admin's Facebook pages
      const { data: pages } = await supabase
        .from("facebook_page_connections")
        .select("*")
        .order("created_at", { ascending: false });

      // Load admin posts (using promotional_articles table as source)
      const { data: articles } = await supabase
        .from("promotional_articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setFacebookPages(pages || []);
      setPosts((articles || []).map((a: any) => ({
        id: a.id,
        content: a.excerpt || a.title,
        image_url: a.featured_image,
        channels: a.social_channels || [],
        status: a.social_status || "draft",
        facebook_post_id: a.facebook_post_id,
        gsc_indexed: a.gsc_indexed || false,
        created_at: a.created_at,
        published_at: a.social_published_at,
      })));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const publishNewPost = async () => {
    if (!newPost.content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }

    setPublishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call edge function to publish
      const response = await supabase.functions.invoke("admin-publish-social", {
        body: {
          content: newPost.content,
          imageUrl: newPost.imageUrl || null,
          indexOnGsc: newPost.indexOnGsc,
          publishToFacebook: newPost.publishToFacebook,
          pageIds: facebookPages.filter(p => p.auto_share_enabled).map(p => p.page_id),
        },
      });

      if (response.error) throw response.error;

      toast.success("Post publié avec succès!");
      setNewPost({ content: "", imageUrl: "", indexOnGsc: true, publishToFacebook: true });
      loadData();
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error.message || "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Supprimer ce post ?")) return;
    
    try {
      await supabase.from("promotional_articles").delete().eq("id", id);
      toast.success("Post supprimé");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Facebook className="h-6 w-6 text-blue-600" />
          <Instagram className="h-6 w-6 text-pink-600" />
          Social Media Admin
        </h2>
        <p className="text-muted-foreground mt-1">
          Publiez du contenu sur les réseaux sociaux avec indexation Google automatique
        </p>
      </div>

      {/* Connected Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Pages Facebook Connectées
          </CardTitle>
          <CardDescription>
            Les posts seront publiés sur les pages avec auto-post activé
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facebookPages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune page Facebook connectée. Connectez-vous via Social Media &gt; Paramètres.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {facebookPages.map((page) => (
                <Badge 
                  key={page.id} 
                  variant={page.auto_share_enabled ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  <Facebook className="h-3 w-3" />
                  {page.page_name}
                  {page.auto_share_enabled && <CheckCircle className="h-3 w-3 text-green-500" />}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Post Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau Post
          </CardTitle>
          <CardDescription>
            Créez un post qui sera automatiquement indexé sur Google et publié sur Facebook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contenu du post</Label>
            <Textarea
              placeholder="Écrivez votre contenu ici..."
              value={newPost.content}
              onChange={(e) => setNewPost(p => ({ ...p, content: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image (URL optionnelle)
            </Label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={newPost.imageUrl}
              onChange={(e) => setNewPost(p => ({ ...p, imageUrl: e.target.value }))}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.indexOnGsc}
                onCheckedChange={(checked) => setNewPost(p => ({ ...p, indexOnGsc: checked }))}
              />
              <Label className="flex items-center gap-1 cursor-pointer">
                <Globe className="h-4 w-4 text-green-600" />
                Indexer sur Google Search Console
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.publishToFacebook}
                onCheckedChange={(checked) => setNewPost(p => ({ ...p, publishToFacebook: checked }))}
              />
              <Label className="flex items-center gap-1 cursor-pointer">
                <Facebook className="h-4 w-4 text-blue-600" />
                Publier sur Facebook
              </Label>
            </div>
          </div>

          <Button 
            onClick={publishNewPost} 
            disabled={publishing || !newPost.content.trim()}
            className="w-full"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publier
          </Button>
        </CardContent>
      </Card>

      {/* Posts History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des Publications</CardTitle>
          <CardDescription>
            {posts.length} publication(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune publication pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>
                        {post.status}
                      </Badge>
                      {post.gsc_indexed && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Globe className="h-3 w-3 mr-1" />
                          GSC
                        </Badge>
                      )}
                      {post.facebook_post_id && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          <Facebook className="h-3 w-3 mr-1" />
                          FB
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSocialMedia;
