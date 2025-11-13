import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoBookingRequest {
  businessEmail: string;
  firstName: string;
  lastName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('📧 [send-demo-booking] Function invoked');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessEmail, firstName, lastName, role }: DemoBookingRequest = await req.json();

    console.log('📧 [send-demo-booking] Request data:', {
      businessEmail,
      firstName,
      lastName,
      role
    });

    // Validate required fields
    if (!businessEmail || !firstName || !lastName || !role) {
      console.error('❌ [send-demo-booking] Missing required fields');
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessEmail)) {
      console.error('❌ [send-demo-booking] Invalid email format');
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email to support@newai.sale
    const emailResponse = await resend.emails.send({
      from: "NewAI Demo <onboarding@resend.dev>",
      to: ["support@newai.sale"],
      subject: `New Demo Request from ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .info-row {
                background: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 6px;
                border-left: 4px solid #667eea;
              }
              .label {
                font-weight: 600;
                color: #667eea;
                margin-bottom: 5px;
              }
              .value {
                color: #333;
                font-size: 16px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎯 New Demo Request</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone wants to see Quickshot in action!</p>
            </div>
            
            <div class="content">
              <div class="info-row">
                <div class="label">👤 Name</div>
                <div class="value">${firstName} ${lastName}</div>
              </div>
              
              <div class="info-row">
                <div class="label">📧 Business Email</div>
                <div class="value"><a href="mailto:${businessEmail}" style="color: #667eea; text-decoration: none;">${businessEmail}</a></div>
              </div>
              
              <div class="info-row">
                <div class="label">💼 Role</div>
                <div class="value">${role}</div>
              </div>
              
              <div class="info-row">
                <div class="label">📅 Submitted At</div>
                <div class="value">${new Date().toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>This email was sent automatically from your NewAI demo booking form</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ [send-demo-booking] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo booking email sent successfully",
        emailResponse 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('❌ [send-demo-booking] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send demo booking email",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
