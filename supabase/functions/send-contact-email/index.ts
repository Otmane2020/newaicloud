import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        } 
      }
    );

    const formData: ContactFormData = await req.json();
    console.log("📬 Formulaire de contact reçu:", formData);

    // Validate input
    if (!formData.name || !formData.email || !formData.message) {
      return new Response(
        JSON.stringify({ error: "Nom, email et message sont requis" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Insert into admin_emails table
    const { data, error } = await supabaseClient
      .from('admin_emails')
      .insert({
        from_email: formData.email,
        to_email: 'support@seobox.fr',
        subject: formData.subject || `Message de ${formData.name}`,
        body: `De: ${formData.name} (${formData.email})\n\nMessage:\n${formData.message}`,
        html_body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nouveau message de contact</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>De:</strong> ${formData.name}</p>
              <p><strong>Email:</strong> ${formData.email}</p>
              ${formData.subject ? `<p><strong>Sujet:</strong> ${formData.subject}</p>` : ''}
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h3 style="color: #555;">Message:</h3>
              <p style="line-height: 1.6; color: #333;">${formData.message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        `,
        direction: 'incoming',
        status: 'received',
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de l'enregistrement:", error);
      throw error;
    }

    console.log("✅ Message de contact enregistré:", data.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Message enregistré avec succès',
      emailId: data.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur dans send-contact-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible d\'enregistrer le message' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
