/**
 * Skeleton des pages coach / admin.
 *
 * Volontairement SANS fond : il hérite de celui du layout. Le portail coach est
 * clair (#f4f5f7) et l'admin bascule clair/sombre selon le thème — un fond fixe
 * provoquerait un flash de la mauvaise couleur à chaque navigation.
 *
 * Les blocs sont d'un gris médian semi-transparent : posé sur clair il s'assombrit,
 * posé sur sombre il s'éclaircit, avec un écart d'environ 45 niveaux dans les deux
 * cas — encore visible quand l'animation redescend à 0,6 d'opacité. Une teinte plus
 * discrète (0,18) disparaissait complètement sur le fond admin sombre.
 *
 * PageSkeleton reste réservé à l'app cliente, qui est toujours sombre.
 */
export default function PanelSkeleton() {
  const bloc: React.CSSProperties = {
    backgroundColor: "rgba(128,128,128,0.4)",
    borderRadius: 10,
  };
  return (
    <div style={{ padding: 20, width: "100%" }}>
      <div className="skeleton-pulse" style={{ ...bloc, height: 22, width: 200, marginBottom: 22 }} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="skeleton-pulse" style={{ ...bloc, height: 64, flex: 1 }} />
        <div className="skeleton-pulse" style={{ ...bloc, height: 64, flex: 1 }} />
        <div className="skeleton-pulse" style={{ ...bloc, height: 64, flex: 1 }} />
      </div>
      <div className="skeleton-pulse" style={{ ...bloc, height: 140, marginBottom: 12 }} />
      <div className="skeleton-pulse" style={{ ...bloc, height: 140 }} />
    </div>
  );
}
