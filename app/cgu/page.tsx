import type { Metadata } from "next";
import Link from "next/link";
import PageLegale, { Section, Contact } from "@/components/PageLegale";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Time To Move",
  description: "Les règles d'utilisation de l'application Time To Move.",
};

export default function CguPage() {
  return (
    <PageLegale titre="CONDITIONS D'UTILISATION">
      <Section titre="1. L'application">
        <p style={{ margin: "0 0 8px" }}>
          L&apos;application Time To Move donne accès à deux accompagnements : <strong>Time To Move</strong>, un coaching sportif et nutritionnel
          suivi par une coach, et <strong>Time To Live</strong>, un abonnement donnant accès à des séances, des plans alimentaires et des contenus vidéo.
        </p>
        <p style={{ margin: 0 }}>Elle est éditée par :</p>
        <div style={{ marginTop: 8 }}><Contact /></div>
      </Section>

      <Section titre="2. Votre compte">
        <p style={{ margin: 0 }}>
          L&apos;accès est personnel. Vous êtes responsable de la confidentialité de votre mot de passe et vous vous engagez à ne pas partager
          votre accès ni les contenus de l&apos;application avec d&apos;autres personnes. Les informations que vous renseignez doivent être exactes.
        </p>
      </Section>

      <Section titre="3. Santé et pratique sportive">
        <p style={{ margin: "0 0 8px" }}>
          Les programmes, séances et conseils alimentaires proposés sont des contenus de coaching. <strong>Ils ne constituent pas un avis médical</strong> et
          ne remplacent pas une consultation auprès d&apos;un professionnel de santé.
        </p>
        <p style={{ margin: 0 }}>
          Avant de commencer, assurez-vous auprès de votre médecin que la pratique sportive et les changements alimentaires vous conviennent,
          en particulier en cas de grossesse, de blessure, de maladie ou de traitement. Arrêtez l&apos;exercice et consultez en cas de douleur ou de malaise.
          Vous pratiquez sous votre propre responsabilité.
        </p>
      </Section>

      <Section titre="4. Abonnement et paiement">
        <p style={{ margin: "0 0 8px" }}>
          L&apos;abonnement Time To Live est payé par carte via notre prestataire Stripe et se renouvelle automatiquement jusqu&apos;à sa résiliation.
          Vous pouvez le résilier à tout moment depuis votre profil.
        </p>
        <p style={{ margin: 0 }}>
          Les conditions de l&apos;accompagnement Time To Move (durée, tarif, modalités de paiement) sont celles convenues avec l&apos;équipe lors de votre inscription.
        </p>
      </Section>

      <Section titre="5. Contenus">
        <p style={{ margin: 0 }}>
          Les programmes, vidéos, plans alimentaires, recettes et documents de l&apos;application sont réservés à votre usage personnel.
          Il est interdit de les copier, de les diffuser ou de les revendre sans notre accord écrit.
        </p>
      </Section>

      <Section titre="6. Vos données">
        <p style={{ margin: 0 }}>
          L&apos;utilisation de vos données est décrite dans la{" "}
          <Link href="/confidentialite" style={{ color: "#B22222" }}>politique de confidentialité</Link>.
        </p>
      </Section>

      <Section titre="7. Suppression du compte">
        <p style={{ margin: 0 }}>
          Vous pouvez supprimer votre compte à tout moment depuis <strong>Profil › Supprimer mon compte</strong>. La suppression est définitive et
          arrête l&apos;abonnement Time To Live en cours. Nous pouvons suspendre ou fermer un compte en cas de non-respect des présentes conditions.
        </p>
      </Section>

      <Section titre="8. Disponibilité">
        <p style={{ margin: 0 }}>
          Nous faisons le nécessaire pour que l&apos;application reste accessible, sans pouvoir garantir une disponibilité permanente :
          des interruptions pour maintenance ou des incidents techniques peuvent survenir.
        </p>
      </Section>

      <Section titre="9. Modifications">
        <p style={{ margin: 0 }}>
          Ces conditions peuvent évoluer. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>
    </PageLegale>
  );
}
