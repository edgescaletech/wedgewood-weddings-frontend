import React from "react";

export const styles = `
.welcome-screen {
  min-height: 100vh;
  background-color: #104737;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 60px 80px 48px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}

.welcome-content {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.welcome-tag {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}

.welcome-headline {
  font-size: 52px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 48px 0;
  color: #ffffff;
}

.welcome-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 48px;
}

.welcome-card {
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  padding: 24px 28px;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.welcome-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.35);
}

.welcome-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.welcome-card p {
  font-size: 15px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.welcome-footer {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
}

.welcome-footer-note {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.btn-start-scheduling {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  color: #104737;
  font-size: 15px;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-start-scheduling:hover {
  background-color: #f3f7f5;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .welcome-screen {
    padding: 32px 24px;
  }
  .welcome-headline {
    font-size: 34px;
  }
  .welcome-grid {
    grid-template-columns: 1fr;
  }
  .welcome-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
`;

export default function IndexPage() {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-tag">THE WEDGEWOOD SCHEDULING APP</div>
        <h1 className="welcome-headline">
          Less time on scheduling.<br />
          More time with your team.
        </h1>

        <div className="welcome-grid">
          <div className="welcome-card">
            <h3>Everything together</h3>
            <p>Event details, BEOs, availability and time off.</p>
          </div>

          <div className="welcome-card">
            <h3>Easier scheduling</h3>
            <p>A visual calendar. Shifts you can edit directly.</p>
          </div>

          <div className="welcome-card">
            <h3>Checks as you go</h3>
            <p>Catch conflicts and keep labor goals in view.</p>
          </div>

          <div className="welcome-card">
            <h3>Publish once</h3>
            <p>Send shifts to ADP without re-entry.</p>
          </div>
        </div>
      </div>

      <footer className="welcome-footer">
        <span className="welcome-footer-note">
          Early designs · Built with feedback from Wedgewood GMs
        </span>
        <a href="/staffing/" className="btn-start-scheduling">
          Start scheduling →
        </a>
      </footer>
    </div>
  );
}
