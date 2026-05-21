function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div>
        <strong>AI Expense Assistant</strong>
        <p>AI-powered spending insights</p>
      </div>

      <div className="footer-copyright">
        <p>Copyright 2020-{currentYear} IDEA INFO TECH INC.</p>
        <p>All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
