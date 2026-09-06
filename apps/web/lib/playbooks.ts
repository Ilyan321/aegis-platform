/**
 * Aegis Remediation Playbooks Engine
 * 
 * Provides automated, vendor-specific remediation intelligence, one-click copyable
 * terminal commands, and actionable containment steps for detected secret leaks.
 */

import { Incident } from "./api";

export interface PlaybookStep {
  step: number;
  title: string;
  description: string;
  commandTemplate?: string;
  portalUrl?: string;
  portalLabel?: string;
  actionType: "CLI" | "CONSOLE" | "GIT" | "CHECKLIST";
}

export interface RemediationPlaybook {
  id: string;
  vendor: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  summary: string;
  documentationUrl: string;
  dashboardUrl?: string;
  dashboardLabel?: string;
  steps: PlaybookStep[];
  gitScrubbing: {
    recommendedTool: "git-filter-repo" | "bfg";
    commands: string[];
    notice: string;
  };
}

export function getRemediationPlaybook(incident: Incident): RemediationPlaybook {
  const rule = (incident.rule_id || "").toLowerCase();
  const name = (incident.rule_name || "").toLowerCase();
  const path = (incident.file_path || "").toLowerCase();
  const snippet = incident.masked_snippet || "";

  // Extract a clean token hint if possible (e.g. AKIA...)
  const extractedToken = snippet.replace(/["';=\s]/g, "").trim();

  // 1. AWS Identity & Access Management
  if (rule.includes("aws") || name.includes("aws") || snippet.includes("AKIA") || snippet.includes("ASIA")) {
    const keyHint = extractedToken.startsWith("AKIA") || extractedToken.startsWith("ASIA")
      ? extractedToken.slice(0, 20)
      : "<AWS_ACCESS_KEY_ID>";

    return {
      id: "aws-iam",
      vendor: "Amazon Web Services",
      category: "Cloud Infrastructure",
      severity: "CRITICAL",
      summary: "Compromised AWS IAM Access Keys provide direct programmatic control over cloud infrastructure. Immediate key deactivation and CloudTrail inspection is mandatory.",
      documentationUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey",
      dashboardUrl: "https://console.aws.amazon.com/iam/home#/users",
      dashboardLabel: "Open AWS IAM Console",
      steps: [
        {
          step: 1,
          title: "Immediately Deactivate Leaked Access Key",
          description: "Deactivating the key stops active exploitation while allowing application teams to prepare new credentials.",
          commandTemplate: `aws iam update-access-key --access-key-id ${keyHint} --status Inactive`,
          actionType: "CLI",
        },
        {
          step: 2,
          title: "Audit AWS CloudTrail for Unauthorized Activity",
          description: "Inspect CloudTrail event logs to identify any unauthorized API actions performed with this credential.",
          commandTemplate: `aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=${keyHint} --max-results 50`,
          actionType: "CLI",
        },
        {
          step: 3,
          title: "Delete Compromised Access Key",
          description: "Permanently purge the compromised key after deploying replacement credentials.",
          commandTemplate: `aws iam delete-access-key --access-key-id ${keyHint}`,
          actionType: "CLI",
        },
        {
          step: 4,
          title: "Deploy Replacement Credentials",
          description: "Generate replacement credentials and store them directly in AWS Secrets Manager or your CI/CD secrets store.",
          portalUrl: "https://console.aws.amazon.com/secretsmanager/",
          portalLabel: "Open AWS Secrets Manager",
          actionType: "CONSOLE",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
          `git push origin --force --tags`,
        ],
        notice: "Scrubbing git history removes historical commit snapshots from your git repository. Inform collaborators before force-pushing rewritten branches.",
      },
    };
  }

  // 2. GitHub Personal Access & OAuth Tokens
  if (rule.includes("github") || name.includes("github") || snippet.includes("ghp_") || snippet.includes("gho_") || snippet.includes("ghs_")) {
    return {
      id: "github-pat",
      vendor: "GitHub",
      category: "Source Code Management",
      severity: "CRITICAL",
      summary: "GitHub personal access tokens and OAuth tokens grant repository, package, or organizational read/write access. Revoke immediately via GitHub Settings.",
      documentationUrl: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation",
      dashboardUrl: "https://github.com/settings/tokens",
      dashboardLabel: "GitHub Token Settings",
      steps: [
        {
          step: 1,
          title: "Revoke Leaked Token via GitHub Web Settings",
          description: "Navigate to GitHub Personal Access Tokens and delete the compromised token immediately.",
          portalUrl: "https://github.com/settings/tokens",
          portalLabel: "Delete Token on GitHub",
          actionType: "CONSOLE",
        },
        {
          step: 2,
          title: "Rotate Exposed Repository Secret",
          description: "If this token is configured as an Actions secret, update the secret in repository settings.",
          commandTemplate: `gh secret set GITHUB_TOKEN -R <owner>/<repo>`,
          actionType: "CLI",
        },
        {
          step: 3,
          title: "Audit Organization Security Log",
          description: "Check GitHub Security Audit Log for anomalous cloning, repository forks, or workflow dispatches.",
          portalUrl: "https://github.com/settings/audit-log",
          portalLabel: "Open GitHub Audit Log",
          actionType: "CONSOLE",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Ensure all team members re-clone or rebase after historical rewriting.",
      },
    };
  }

  // 3. Stripe Payments API Keys
  if (rule.includes("stripe") || name.includes("stripe") || snippet.includes("sk_live_") || snippet.includes("rk_live_")) {
    return {
      id: "stripe-key",
      vendor: "Stripe",
      category: "Payment Processing",
      severity: "CRITICAL",
      summary: "Compromised Stripe live keys allow unauthorized charges, refunds, or customer data exfiltration. Expire the key and switch to a restricted key.",
      documentationUrl: "https://stripe.com/docs/keys#rotating-compromised-keys",
      dashboardUrl: "https://dashboard.stripe.com/apikeys",
      dashboardLabel: "Stripe API Keys Dashboard",
      steps: [
        {
          step: 1,
          title: "Expire Compromised Secret Key",
          description: "Expire the key in Stripe Dashboard with either immediate termination or a 24-hour overlap window.",
          portalUrl: "https://dashboard.stripe.com/apikeys",
          portalLabel: "Expire Key on Stripe Dashboard",
          actionType: "CONSOLE",
        },
        {
          step: 2,
          title: "Issue a Restricted API Key",
          description: "Follow the principle of least privilege by creating a Restricted API Key with only the endpoints required for your application.",
          actionType: "CHECKLIST",
        },
        {
          step: 3,
          title: "Inspect Recent Charges & Webhook Events",
          description: "Verify that no unauthorized charges, refunds, or customer export operations were triggered.",
          portalUrl: "https://dashboard.stripe.com/events",
          portalLabel: "View Stripe Audit Events",
          actionType: "CONSOLE",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Remove live financial API keys from repository commit history.",
      },
    };
  }

  // 4. Slack Bot / Webhook Tokens
  if (rule.includes("slack") || name.includes("slack") || snippet.includes("xoxb-") || snippet.includes("xoxp-") || snippet.includes("hooks.slack.com")) {
    return {
      id: "slack-token",
      vendor: "Slack Technologies",
      category: "Collaboration & Webhooks",
      severity: "HIGH",
      summary: "Exposed Slack bot tokens allow message inspection, private channel access, or spam broadcast. Invalidate the token immediately.",
      documentationUrl: "https://api.slack.com/authentication/rotation",
      dashboardUrl: "https://api.slack.com/apps",
      dashboardLabel: "Manage Slack Apps",
      steps: [
        {
          step: 1,
          title: "Revoke OAuth Access Token",
          description: "Call Slack auth.revoke endpoint to immediately decommission the leaked token.",
          commandTemplate: `curl -s -X POST https://slack.com/api/auth.revoke -H "Authorization: Bearer ${extractedToken || "<SLACK_TOKEN>"}"`,
          actionType: "CLI",
        },
        {
          step: 2,
          title: "Re-generate Incoming Webhook URL",
          description: "If this was an incoming webhook URL, delete the compromised webhook from the Slack App configuration and generate a new URL.",
          portalUrl: "https://api.slack.com/apps",
          portalLabel: "Open Slack App Settings",
          actionType: "CONSOLE",
        },
        {
          step: 3,
          title: "Update Team Configuration",
          description: "Store the new token in environment variables or production secret management.",
          actionType: "CHECKLIST",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Remove Slack tokens from version control.",
      },
    };
  }

  // 5. OpenAI / Anthropic LLM API Keys
  if (rule.includes("openai") || name.includes("openai") || rule.includes("anthropic") || snippet.includes("sk-proj") || snippet.includes("sk-ant")) {
    return {
      id: "llm-api-key",
      vendor: "OpenAI / Anthropic",
      category: "AI & Model Providers",
      severity: "HIGH",
      summary: "Leaked AI API tokens can result in rapid token depletion, quota exhaustion, and unauthorized data queries.",
      documentationUrl: "https://platform.openai.com/docs/guides/production-best-practices",
      dashboardUrl: "https://platform.openai.com/api-keys",
      dashboardLabel: "OpenAI API Keys",
      steps: [
        {
          step: 1,
          title: "Revoke Key on Provider Dashboard",
          description: "Delete the leaked key from the API keys dashboard immediately to block further automated inference calls.",
          portalUrl: "https://platform.openai.com/api-keys",
          portalLabel: "Revoke Key on OpenAI",
          actionType: "CONSOLE",
        },
        {
          step: 2,
          title: "Review Token Usage & Billing",
          description: "Examine usage logs to verify whether the key was abused before discovery.",
          portalUrl: "https://platform.openai.com/usage",
          portalLabel: "Check Usage Metrics",
          actionType: "CONSOLE",
        },
        {
          step: 3,
          title: "Generate Project-Scoped Replacement Key",
          description: "Create a new project-scoped key with explicit spending limits and role-based permissions.",
          actionType: "CHECKLIST",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Never commit LLM API keys directly into client-side code or git repositories.",
      },
    };
  }

  // 6. Asymmetric Private Keys (SSH, RSA, PEM)
  if (rule.includes("private") || name.includes("private") || path.endsWith(".pem") || path.endsWith(".key") || snippet.includes("PRIVATE KEY")) {
    return {
      id: "private-key",
      vendor: "SSH / Cryptographic PKI",
      category: "Cryptographic Keys",
      severity: "CRITICAL",
      summary: "Exposed private keys compromise server shell access, code signing integrity, or TLS encryption certificates.",
      documentationUrl: "https://www.ssh.com/academy/ssh/keygen",
      steps: [
        {
          step: 1,
          title: "Revoke Public Key from All Authorized Endpoints",
          description: "Locate and remove the corresponding public key from ~/.ssh/authorized_keys on all servers, bastion hosts, and VCS deploy keys.",
          commandTemplate: `sed -i '/<PUBLIC_KEY_COMMENT>/d' ~/.ssh/authorized_keys`,
          actionType: "CLI",
        },
        {
          step: 2,
          title: "Generate New Ed25519 Key Pair",
          description: "Generate a replacement key pair utilizing modern, high-security Ed25519 curve cryptography.",
          commandTemplate: `ssh-keygen -t ed25519 -a 100 -C "remediated-$(date +%Y%m%d)" -f ~/.ssh/id_ed25519_new`,
          actionType: "CLI",
        },
        {
          step: 3,
          title: "Distribute New Public Key",
          description: "Deploy the newly generated public key (~/.ssh/id_ed25519_new.pub) to authorized hosts via automated configuration management.",
          actionType: "CHECKLIST",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Private keys in git history are immediately scanned and weaponized by internet bots. Rotation is paramount.",
      },
    };
  }

  // 7. Database Connection Strings
  if (rule.includes("postgres") || rule.includes("database") || rule.includes("sql") || rule.includes("mongo") || rule.includes("redis") || path.includes(".env")) {
    return {
      id: "database-credentials",
      vendor: "Database / Data Store",
      category: "Database Infrastructure",
      severity: "CRITICAL",
      summary: "Database connection URIs expose database hostnames, authentication credentials, and internal table structures.",
      documentationUrl: "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
      steps: [
        {
          step: 1,
          title: "Rotate Database User Password",
          description: "Update the password for the exposed database role immediately via administrative SQL.",
          commandTemplate: `ALTER ROLE app_user WITH PASSWORD '<GENERATE_STRONG_RANDOM_PASSWORD>';`,
          actionType: "CLI",
        },
        {
          step: 2,
          title: "Update Application Connection Strings",
          description: "Deploy the updated connection URI to production environment variables and restart connection pools.",
          actionType: "CHECKLIST",
        },
        {
          step: 3,
          title: "Verify Network Firewalls & IP Whitelists",
          description: "Ensure the database is not exposed to 0.0.0.0/0 and only accepts connections from authorized VPC subnets.",
          actionType: "CHECKLIST",
        },
      ],
      gitScrubbing: {
        recommendedTool: "git-filter-repo",
        commands: [
          `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
          `git push origin --force --all`,
        ],
        notice: "Ensure all .env files and local configuration templates are excluded in .gitignore.",
      },
    };
  }

  // 8. Generic API Secret / Fallback Playbook
  return {
    id: "generic-secret",
    vendor: "Generic API / Credential",
    category: "Authentication Credential",
    severity: (incident.severity as "CRITICAL" | "HIGH" | "MEDIUM") || "HIGH",
    summary: `Exposed ${incident.rule_name || "credential"} in ${incident.file_path}. Follow the standard credential rotation and exposure mitigation procedure.`,
    documentationUrl: "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
    steps: [
      {
        step: 1,
        title: "Identify & Revoke Credential at Source",
        description: "Deactivate or invalidate the compromised secret token directly within the service provider's administrative console.",
        actionType: "CONSOLE",
      },
      {
        step: 2,
        title: "Issue Replacement Secret",
        description: "Generate a replacement token with minimum required privilege scope and short-term lifecycle.",
        actionType: "CHECKLIST",
      },
      {
        step: 3,
        title: "Store in Environment Secrets",
        description: "Migrate the credential out of source code into environment variables or a dedicated secrets manager.",
        actionType: "CHECKLIST",
      },
      {
        step: 4,
        title: "Verify Pre-commit Hook Installation",
        description: "Ensure the Aegis CLI pre-commit hook is active locally to intercept future credential leaks before git commits.",
        commandTemplate: `aegis scan . --deep`,
        actionType: "CLI",
      },
    ],
    gitScrubbing: {
      recommendedTool: "git-filter-repo",
      commands: [
        `git filter-repo --path "${incident.file_path}" --invert-paths --force`,
        `git push origin --force --all`,
      ],
      notice: "Scrubbing git history removes historical commit snapshots containing the credential.",
    },
  };
}
