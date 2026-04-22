import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const { email, prenom } = await request.json();

  if (!email || !prenom) {
    return NextResponse.json({ error: "Email et prénom requis" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Si Resend n'est pas configuré → utilise l'envoi natif Supabase
  if (!process.env.RESEND_API_KEY) {
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { prenom },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Resend configuré → génère le lien + envoie via Resend
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { prenom } },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const inviteUrl = linkData.properties?.action_link;
  if (!inviteUrl) {
    return NextResponse.json({ error: "Impossible de générer le lien d'invitation" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: email,
    subject: "Ton accès à l'app Team MJ",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D0D0D;color:#F5F5F0;padding:32px;border-radius:12px">
        <h1 style="font-size:22px;font-weight:700;letter-spacing:0.05em;margin:0 0 8px">TEAM MJ</h1>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 28px;font-size:13px">Ton espace personnalisé</p>
        <p style="font-size:15px;margin:0 0 20px">Bonjour <strong>${prenom}</strong>,</p>
        <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0 0 28px;line-height:1.6">
          Tu as été invitée à rejoindre l'application Team MJ.<br>
          Clique sur le bouton ci-dessous pour créer ton mot de passe et accéder à ton espace.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background:#B22222;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.05em">
          ACCÉDER À MON ESPACE →
        </a>
        <p style="margin:28px 0 0;font-size:11px;color:rgba(255,255,255,0.3)">
          Si tu n'es pas à l'origine de cette demande, ignore cet email.
        </p>
      </div>
    `,
  });

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
