import type { ExpenseInsights } from "../types/expense";

interface InsightCardsProps {
  insights: ExpenseInsights;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function InsightCards({ insights }: InsightCardsProps) {
  const cards = [
    {
      label: "Total spending",
      value: formatCurrency(insights.totalSpending),
    },
    {
      label: "Total income",
      value: formatCurrency(insights.totalIncome),
    },
    {
      label: "Net",
      value: formatCurrency(insights.net),
    },
    {
      label: "Top category",
      value: insights.topCategory
        ? `${insights.topCategory.category} (${formatCurrency(
            insights.topCategory.amount
          )})`
        : "No spending",
    },
  ];

  return (
    <div className="insight-card-grid">
      {cards.map((card) => (
        <div className="insight-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default InsightCards;
