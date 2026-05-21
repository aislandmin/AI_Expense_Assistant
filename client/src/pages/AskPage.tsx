import AskAssistant from "../components/AskAssistant";

function AskPage() {
  return (
    <>
      <section className="page-header workspace-page-header ask-page-header">
        <p className="eyebrow">Ask AI</p>
        <h1>Ask your money.</h1>
        <p>
          Ask focused questions about your saved spending and income records.
          The backend calculates the numbers from the database.
        </p>
      </section>

      <div className="focused-page-grid ask-page-grid">
        <AskAssistant />
        <section className="panel">
          <div className="panel-header">
            <h2>Try questions like</h2>
            <p>Start with simple questions that match saved data.</p>
          </div>
          <div className="prompt-list">
            <span>How much did I spend yesterday?</span>
            <span>How much income did I get in April?</span>
            <span>What category cost the most this month?</span>
            <span>Compare this month vs last month.</span>
          </div>
        </section>
      </div>
    </>
  );
}

export default AskPage;
