import type { Metadata } from "next";
import InscriptionFunnel from "./InscriptionFunnel";

export const metadata: Metadata = {
  title: "Rejoindre Time To Live",
};

export default function InscriptionTtlPage() {
  return <InscriptionFunnel />;
}
