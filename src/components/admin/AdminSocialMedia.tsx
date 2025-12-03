import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Facebook, Instagram, Send, Loader2, Plus, Image, Globe, CheckCircle, AlertCircle, Trash2, Sparkles, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FacebookPageSelector } from "@/components/social/FacebookPageSelector";

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  auto_share_enabled: boolean;
}

interface OAuthPage {
  id: string;
  name: string;
  token: string;
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
  const [connecting, setConnecting] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [oauthPages, setOauthPages] = useState<OAuthPage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  
  // New post form
  const [newPost, setNewPost] = useState({
    content: "",
    imageUrl: "",
    indexOnGsc: true,
    publishToFacebook: true,
    captionStyle: "promotional" as "promotional" | "informative" | "engaging",
  });

  useEffect(() => {
    loadData();
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

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

      const loadedPages = pages || [];
      setFacebookPages(loadedPages);
      setSelectedPageIds(loadedPages.filter(p => p.auto_share_enabled).map(p => p.page_id));
      
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

  const connectFacebook = async () => {
    setConnecting(true);
    try {
      const response = await supabase.functions.invoke("facebook-page-oauth", {
        body: { action: "connect" },
      });

      if (response.error) throw response.error;
      if (response.data?.authUrl) {
        // Open popup for OAuth
        const popup = window.open(
          response.data.authUrl,
          "facebook_oauth",
          "width=600,height=700,scrollbars=yes"
        );

        // Listen for OAuth completion
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "facebook_oauth_complete") {
            window.removeEventListener("message", handleMessage);
            if (event.data.needsPageSelection && event.data.pages) {
              // Map pages to expected format
              const mappedPages = event.data.pages.map((p: any) => ({
                id: p.id,
                name: p.name,
                token: p.access_token || p.token,
              }));
              setOauthPages(mappedPages);
              setShowPageSelector(true);
            } else {
              loadData();
              toast.success("Facebook connecté!");
            }
          }
        };
        window.addEventListener("message", handleMessage);
      }
    } catch (error: any) {
      console.error("Error connecting Facebook:", error);
      toast.error(error.message || "Erreur de connexion Facebook");
    } finally {
      setConnecting(false);
    }
  };

  const generateAICaption = async () => {
    setGeneratingCaption(true);
    try {
      const response = await supabase.functions.invoke("generate-social-caption", {
        body: {
          topic: newPost.content || "NewAI - Optimisation SEO e-commerce",
          style: newPost.captionStyle,
          platform: "facebook",
          includeEmojis: true,
          includeHashtags: true,
        },
      });

      if (response.error) throw response.error;
      
      if (response.data?.caption) {
        setNewPost(p => ({ ...p, content: response.data.caption }));
        toast.success("Caption générée par IA!");
      }
    } catch (error: any) {
      console.error("Error generating caption:", error);
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const publishNewPost = async () => {
    if (!newPost.content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }

    if (newPost.publishToFacebook && selectedPageIds.length === 0) {
      toast.error("Sélectionnez au moins une page Facebook");
      return;
    }

    setPublishing(true);
    try {
      const response = await supabase.functions.invoke("admin-publish-social", {
        body: {
          content: newPost.content,
          imageUrl: newPost.imageUrl || null,
          indexOnGsc: newPost.indexOnGsc,
          publishToFacebook: newPost.publishToFacebook,
          pageIds: selectedPageIds,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      let message = "Post publié!";
      if (result?.gscIndexed) message += " ✅ GSC";
      if (result?.facebookPosted) message += " ✅ Facebook";
      
      toast.success(message);
      setNewPost({ content: "", imageUrl: "", indexOnGsc: true, publishToFacebook: true, captionStyle: "promotional" });
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Pages Facebook
              </CardTitle>
              <CardDescription>
                Connectez vos pages pour publier automatiquement
              </CardDescription>
            </div>
            <Button onClick={connectFacebook} disabled={connecting} variant="outline">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings2 className="h-4 w-4 mr-2" />
              )}
              {facebookPages.length > 0 ? "Ajouter une page" : "Connecter Facebook"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {facebookPages.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Aucune page Facebook connectée
              </p>
              <Button onClick={connectFacebook} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4 mr-2" />
                )}
                Connecter Facebook
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {facebookPages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPageIds.includes(page.page_id) 
                      ? "bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" 
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => togglePageSelection(page.page_id)}
                >
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{page.page_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPageIds.includes(page.page_id) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <Badge variant={page.auto_share_enabled ? "default" : "secondary"}>
                      {page.auto_share_enabled ? "Auto-post activé" : "Manuel"}
                    </Badge>
                  </div>
                </div>
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
            Créez un post avec caption IA, indexation Google et publication Facebook automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Caption Generator */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Style de caption IA</Label>
              <Select 
                value={newPost.captionStyle} 
                onValueChange={(v: any) => setNewPost(p => ({ ...p, captionStyle: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotional">🚀 Promotionnel</SelectItem>
                  <SelectItem value="informative">📚 Informatif</SelectItem>
                  <SelectItem value="engaging">💬 Engageant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={generateAICaption}
              disabled={generatingCaption}
            >
              {generatingCaption ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
              )}
              Générer Caption IA
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Contenu du post</Label>
            <Textarea
              placeholder="Écrivez votre contenu ou générez-le avec l'IA..."
              value={newPost.content}
              onChange={(e) => setNewPost(p => ({ ...p, content: e.target.value }))}
              rows={5}
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

          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.indexOnGsc}
                onCheckedChange={(checked) => setNewPost(p => ({ ...p, indexOnGsc: checked }))}
              />
              <Label className="flex items-center gap-1 cursor-pointer">
                <Globe className="h-4 w-4 text-green-600" />
                Indexer sur Google (GSC)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.publishToFacebook}
                onCheckedChange={(checked) => setNewPost(p => ({ ...p, publishToFacebook: checked }))}
              />
              <Label className="flex items-center gap-1 cursor-pointer">
                <Facebook className="h-4 w-4 text-blue-600" />
                Publier sur Facebook ({selectedPageIds.length} page{selectedPageIds.length > 1 ? "s" : ""})
              </Label>
            </div>
          </div>

          <Button 
            onClick={publishNewPost} 
            disabled={publishing || !newPost.content.trim()}
            className="w-full"
            size="lg"
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

      {/* Page Selector Dialog */}
      {showPageSelector && oauthPages.length > 0 && currentUserId && (
        <FacebookPageSelector
          open={showPageSelector}
          onOpenChange={(open) => {
            setShowPageSelector(open);
            if (!open) {
              setOauthPages([]);
              loadData();
            }
          }}
          pages={oauthPages}
          userId={currentUserId}
          onSuccess={(pageName, instagramName) => {
            setShowPageSelector(false);
            setOauthPages([]);
            loadData();
            toast.success(`Page "${pageName}" connectée!${instagramName ? ` Instagram: ${instagramName}` : ""}`);
          }}
        />
      )}
    </div>
  );
}

export default AdminSocialMedia;
