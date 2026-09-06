"""
Apple-inspired minimalist system status interface for Aegis Platform API root.
Designed with typography, glassmorphism, responsive color schemes, and no AI-slop elements.
"""

def get_status_html(commit: str = "df1e950", version: str = "1.0.0") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark light">
  <title>Aegis Platform · Control Plane</title>
  <style>
    :root {{
      --bg: #000000;
      --card-bg: rgba(28, 28, 30, 0.72);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f5f5f7;
      --text-secondary: #86868b;
      --text-tertiary: #6e6e73;
      --green: #30d158;
      --green-subtle: rgba(48, 209, 88, 0.12);
      --button-bg: rgba(255, 255, 255, 0.06);
      --button-border: rgba(255, 255, 255, 0.1);
      --button-hover: rgba(255, 255, 255, 0.12);
      --row-border: rgba(255, 255, 255, 0.06);
    }}

    @media (prefers-color-scheme: light) {{
      :root {{
        --bg: #f5f5f7;
        --card-bg: rgba(255, 255, 255, 0.85);
        --card-border: rgba(0, 0, 0, 0.08);
        --text-primary: #1d1d1f;
        --text-secondary: #6e6e73;
        --text-tertiary: #86868b;
        --green: #34c759;
        --green-subtle: rgba(52, 199, 89, 0.14);
        --button-bg: rgba(0, 0, 0, 0.04);
        --button-border: rgba(0, 0, 0, 0.08);
        --button-hover: rgba(0, 0, 0, 0.08);
        --row-border: rgba(0, 0, 0, 0.06);
      }}
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background-color: var(--bg);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}

    .container {{
      width: 100%;
      max-width: 540px;
    }}

    .card {{
      background: var(--card-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 36px 32px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35);
    }}

    .brand-row {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }}

    .brand {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .brand-icon {{
      width: 24px;
      height: 24px;
      fill: none;
      stroke: var(--text-primary);
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }}

    .brand-title {{
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }}

    .status-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--green-subtle);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      color: var(--green);
    }}

    .status-dot {{
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
    }}

    .hero-title {{
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.025em;
      color: var(--text-primary);
      margin-bottom: 6px;
    }}

    .hero-subtitle {{
      font-size: 13px;
      line-height: 1.45;
      color: var(--text-secondary);
      margin-bottom: 28px;
    }}

    .spec-table {{
      width: 100%;
      border-top: 1px solid var(--row-border);
      margin-bottom: 28px;
    }}

    .spec-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 0;
      border-bottom: 1px solid var(--row-border);
      font-size: 12px;
    }}

    .spec-label {{
      color: var(--text-secondary);
      font-weight: 400;
    }}

    .spec-value {{
      color: var(--text-primary);
      font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      letter-spacing: -0.01em;
    }}

    .actions {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }}

    .btn {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--button-bg);
      border: 1px solid var(--button-border);
      color: var(--text-primary);
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      padding: 10px 14px;
      border-radius: 12px;
      transition: all 0.15s ease;
      cursor: pointer;
    }}

    .btn:hover {{
      background: var(--button-hover);
      border-color: rgba(255, 255, 255, 0.2);
    }}

    .btn-secondary {{
      color: var(--text-secondary);
    }}

    .btn-secondary:hover {{
      color: var(--text-primary);
    }}

    .footer {{
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      font-size: 11px;
      color: var(--text-tertiary);
    }}

    .live-ping {{
      display: flex;
      align-items: center;
      gap: 4px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="brand-row">
        <div class="brand">
          <svg class="brand-icon" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span class="brand-title">Aegis Platform</span>
        </div>
        <div class="status-badge">
          <div class="status-dot"></div>
          <span>Active</span>
        </div>
      </div>

      <h1 class="hero-title">Control Plane Online</h1>
      <p class="hero-subtitle">
        High-throughput cryptographic secret scanner and automated policy enforcement fabric.
      </p>

      <div class="spec-table">
        <div class="spec-row">
          <span class="spec-label">Service</span>
          <span class="spec-value">aegis-platform-api</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Runtime Status</span>
          <span class="spec-value" style="color: var(--green);">Operational · 200 OK</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Release Version</span>
          <span class="spec-value">v{version}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Commit Hash</span>
          <span class="spec-value">{commit}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Hosting Environment</span>
          <span class="spec-value">Render Cloud (ASGI)</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Gateway Endpoint</span>
          <span class="spec-value">/api/v1</span>
        </div>
      </div>

      <div class="actions">
        <a href="/docs" class="btn">
          <span>API Documentation</span>
          <span style="opacity: 0.5;">&rsaquo;</span>
        </a>
        <a href="/health/ready" class="btn btn-secondary">
          <span>Readiness Probe</span>
          <span style="opacity: 0.5;">&rsaquo;</span>
        </a>
      </div>
    </div>

    <div class="footer">
      <span>Aegis Security Ecosystem</span>
      <span class="live-ping" id="livePing">Checking latency...</span>
    </div>
  </div>

  <script>
    (function() {{
      const start = performance.now();
      fetch('/health')
        .then(r => r.json())
        .then(() => {{
          const lat = Math.round(performance.now() - start);
          const el = document.getElementById('livePing');
          if (el) el.textContent = 'Latency: ' + lat + 'ms';
        }})
        .catch(() => {{
          const el = document.getElementById('livePing');
          if (el) el.textContent = 'Keep-alive active';
        }});
    }})();
  </script>
</body>
</html>
"""
