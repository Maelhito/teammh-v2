import type { Metadata } from "next";
import PageLegale, { Section, Contact } from "@/components/PageLegale";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Time To Move",
  description: "Quelles données l'application Time To Move collecte, pourquoi, et comment les supprimer.",
};

const liste: React.CSSProperties = { margin: "0 0 8px", paddingLeft: 20 };

export default function ConfidentialitePage() {
  return (
    <PageLegale titre="POLITIQUE DE CONFIDENTIALITÉ">
      <Section titre="1. Qui est responsable de vos données">
        <Contact />
      </Section>

      <Section titre="2. Les données que nous collectons">
        <ul style={liste}>
          <li><strong>Compte</strong> : prénom, nom, adresse email, mot de passe (conservé chiffré, illisible par l&apos;équipe), fuseau horaire de votre appareil.</li>
          <li><strong>Profil</strong> : photo de profil et informations que vous choisissez de renseigner.</li>
          <li><strong>Suivi physique</strong> : mesures corporelles (poids, tours de taille, etc.) et photos de progression que vous ajoutez vous-même.</li>
          <li><strong>Questionnaires</strong> : vos réponses aux questionnaires de démarrage (objectifs, pratique sportive, habitudes).</li>
          <li><strong>Activité dans l&apos;app</strong> : séances validées, modules et vidéos suivis, tâches cochées, rendez-vous de votre calendrier.</li>
          <li><strong>Notifications</strong> : si vous les activez, l&apos;identifiant technique de votre appareil nécessaire pour vous les envoyer.</li>
          <li><strong>Abonnement Time To Live</strong> : l&apos;état de votre abonnement et ses identifiants. Vos coordonnées bancaires sont saisies chez notre prestataire de paiement Stripe : nous n&apos;y avons jamais accès.</li>
        </ul>
        <p style={{ margin: 0 }}>
          Les mesures, les photos de progression et les réponses aux questionnaires peuvent révéler des informations sur votre santé.
          Vous les fournissez volontairement, et elles ne servent qu&apos;à votre accompagnement.
        </p>
      </Section>

      <Section titre="3. Pourquoi nous les utilisons">
        <ul style={liste}>
          <li>Vous donner accès à votre programme, à vos séances et à vos contenus.</li>
          <li>Permettre à votre coach de suivre votre progression et d&apos;adapter votre accompagnement.</li>
          <li>Vous envoyer les rappels que vous avez activés.</li>
          <li>Gérer votre abonnement.</li>
        </ul>
        <p style={{ margin: 0 }}>Vos données ne sont ni vendues, ni utilisées à des fins publicitaires.</p>
      </Section>

      <Section titre="4. Qui y a accès">
        <p style={{ margin: "0 0 8px" }}>
          Seules l&apos;équipe de coaching et vous-même accédez à vos données. Vos photos de progression sont stockées dans un espace privé :
          elles ne sont visibles que par vous et par l&apos;équipe qui vous accompagne.
        </p>
        <p style={{ margin: "0 0 8px" }}>Nous faisons appel à des prestataires techniques, qui traitent ces données uniquement pour notre compte :</p>
        <ul style={liste}>
          <li><strong>Supabase</strong> : base de données, comptes et stockage des fichiers.</li>
          <li><strong>Vercel</strong> : hébergement de l&apos;application.</li>
          <li><strong>Stripe</strong> : paiement de l&apos;abonnement Time To Live.</li>
          <li><strong>Notion</strong> : suivi interne des abonnements par l&apos;équipe.</li>
          <li><strong>YouTube</strong> : lecture des vidéos. Lorsqu&apos;une vidéo est lue, YouTube (Google) peut collecter des données selon sa propre politique.</li>
        </ul>
        <p style={{ margin: 0 }}>Certains de ces prestataires peuvent traiter des données en dehors de votre pays de résidence.</p>
      </Section>

      <Section titre="5. Combien de temps nous les gardons">
        <p style={{ margin: 0 }}>
          Vos données sont conservées tant que votre compte existe. Lorsque vous supprimez votre compte, elles sont effacées,
          à l&apos;exception des informations de facturation que la loi nous impose de conserver.
        </p>
      </Section>

      <Section titre="6. Supprimer votre compte et vos données">
        <p style={{ margin: 0 }}>
          Vous pouvez supprimer votre compte à tout moment depuis l&apos;application : <strong>Profil › Supprimer mon compte</strong>.
          La suppression est immédiate et définitive : profil, mesures, photos, suivi et abonnement en cours.
          Vous pouvez aussi nous le demander par les moyens de contact indiqués ci-dessus.
        </p>
      </Section>

      <Section titre="7. Vos droits">
        <p style={{ margin: 0 }}>
          Vous pouvez à tout moment demander à consulter vos données, à les faire corriger, à les faire effacer, à en recevoir une copie
          ou à vous opposer à leur utilisation. Il suffit de nous écrire aux coordonnées indiquées ci-dessus. Si vous estimez que vos droits
          ne sont pas respectés, vous pouvez saisir l&apos;autorité de protection des données compétente (en France, la CNIL).
        </p>
      </Section>

      <Section titre="8. Cookies">
        <p style={{ margin: 0 }}>
          L&apos;application n&apos;utilise que les cookies indispensables à son fonctionnement (garder votre session ouverte, retenir vos préférences d&apos;affichage).
          Elle n&apos;utilise aucun traceur publicitaire ni outil de mesure d&apos;audience.
        </p>
      </Section>

      <Section titre="9. Modifications">
        <p style={{ margin: 0 }}>
          Cette politique peut évoluer. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>
    </PageLegale>
  );
}
