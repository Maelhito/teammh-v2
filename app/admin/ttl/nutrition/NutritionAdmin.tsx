"use client";

import { PageHeader } from "../TtlShared";
import PlansAdmin from "./PlansAdmin";
import RecettesAdmin from "./RecettesAdmin";
import StockageAdmin from "./StockageAdmin";

export default function NutritionAdmin() {
  return (
    <div>
      <PageHeader title="Nutrition Time To Last" subtitle="Plans alimentaires et recettes de l'onglet Alimentation" />
      <PlansAdmin />
      <RecettesAdmin />
      <StockageAdmin />
    </div>
  );
}
