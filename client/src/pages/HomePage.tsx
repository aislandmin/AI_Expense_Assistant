import { Link } from "react-router-dom";
import heroBackground from "../assets/home-hero-bg.png";

function HomePage() {
  return (
    <div className="public-page">
      <section className="public-hero">
        <img
          src={heroBackground}
          alt=""
          aria-hidden="true"
          className="public-hero-bg"
        />
        <div>
          <p className="eyebrow">AI Personal Finance</p>
          <h1>Talk to your money.</h1>
          <p>
            Track expenses naturally, ask questions about spending, and
            understand your financial habits without a heavy accounting app.
          </p>
          <div className="hero-actions">
            <Link className="primary-link-button" to="/signup">
              Start Tracking
            </Link>
            <Link className="secondary-button nav-button" to="/login">
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="public-card-grid">
        <article>
          <span>01</span>
          <h2>Record naturally</h2>
          <p>Type notes like "coffee $6 today" and review before saving.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Ask money</h2>
          <p>Ask about categories, income, monthly comparisons, and totals.</p>
        </article>
        <article>
          <span>03</span>
          <h2>See trends</h2>
          <p>Use summaries and insights to understand where money goes.</p>
        </article>
      </section>
    </div>
  );
}

export default HomePage;
