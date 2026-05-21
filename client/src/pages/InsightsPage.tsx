import { lazy, Suspense } from "react";

const FinancialInsights = lazy(() => import("../components/FinancialInsights"));

function InsightsPage() {
  return (
    <>
      <section className="page-header workspace-page-header insights-page-header">
        <p className="eyebrow">Insights</p>
        <h1>Visualize spending for a selected period.</h1>
        <p>
          Review totals, income, net, category breakdowns, and daily trends
          from saved entries.
        </p>
      </section>

      <Suspense fallback={<p className="muted">Loading insights...</p>}>
        <FinancialInsights refreshKey={0} />
      </Suspense>
    </>
  );
}

export default InsightsPage;
