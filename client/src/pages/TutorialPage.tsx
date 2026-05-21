function TutorialPage() {
  return (
    <div className="public-page">
      <section className="page-header workspace-page-header tutorial-page-header">
        <p className="eyebrow">Tutorial</p>
        <h1>How to use AI Expense Assistant.</h1>
        <p>
          Start with a few entries, ask a question, then use insights to review
          your habits over time.
        </p>
      </section>

      <section className="tutorial-steps">
        <article>
          <span>1</span>
          <div>
            <h2>Record naturally</h2>
            <p>Use Quick Add or the structured form to save spending or income.</p>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <h2>Ask money</h2>
            <p>Try questions like "How much did I spend on food this month?"</p>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <h2>See trends</h2>
            <p>Choose a period and compare totals, categories, and trends.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

export default TutorialPage;
