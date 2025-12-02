import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Facebook, Instagram, Loader2, Send, Trash2, Eye, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import CreatePostDialog from "./CreatePostDialog";

interface SocialPostsListProps {
  userId?: string;
  storeId?: string;
}

const SocialPostsList = ({ userId, storeId }: SocialPostsListProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId, storeId]);

  const loadPosts = async () => {
    try {
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async (postId: string) => {
    setPublishing(postId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-social-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ postId, userId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`Post publié ! (${data.creditsConsumed} crédits)`);
        loadPosts();
      } else {
        throw new Error(data.error || 'Erreur de publication');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPublishing(null);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Supprimer ce post ?')) return;
    
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Post supprimé');
      loadPosts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Publié</Badge>;
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Planifié</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Échec</Badge>;
      default:
        return <Badge variant="outline">Brouillon</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun post</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier post pour les réseaux sociaux
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {/* Image preview */}
              {post.image_url && (
                <div className="aspect-square bg-muted relative">
                  <img
                    src={post.image_url}
                    alt="Post preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {post.channels?.includes('facebook') && (
                      <div className="p-1.5 bg-blue-600 rounded-full">
                        <Facebook className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {post.channels?.includes('instagram') && (
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                        <Instagram className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(post.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>

                {/* Caption preview */}
                <p className="text-sm line-clamp-3 mb-3">
                  {post.caption || 'Sans légende'}
                </p>

                {/* Content type */}
                <p className="text-xs text-muted-foreground mb-3">
                  {post.content_type === 'product' && '🏷️ Produit'}
                  {post.content_type === 'collection' && '📁 Collection'}
                  {post.content_type === 'article' && '📝 Article'}
                </p>

                {/* Error message */}
                {post.error_message && (
                  <p className="text-xs text-destructive mb-3 line-clamp-2">
                    {post.error_message}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {post.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => publishPost(post.id)}
                      disabled={publishing === post.id}
                      className="flex-1"
                    >
                      {publishing === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Publier
                        </>
                      )}
                    </Button>
                  )}
                  {post.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishPost(post.id)}
                      disabled={publishing === post.id}
                      className="flex-1"
                    >
                      {publishing === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Réessayer'
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Credits consumed */}
                {post.credits_consumed > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    💰 {post.credits_consumed} crédits
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Post Dialog */}
      {showCreateDialog && (
        <CreatePostDialog
          userId={userId}
          storeId={storeId}
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            setShowCreateDialog(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
};

export default SocialPostsList;
