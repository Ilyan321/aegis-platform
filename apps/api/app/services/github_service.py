import logging
from typing import Tuple
import httpx
from app.core.config import settings

logger = logging.getLogger("aegis.github")


class GitHubService:
    """
    Automated GitHub platform integration service for repository webhooks,
    OAuth scopes, and push/PR interception.
    """

    @staticmethod
    def get_webhook_url() -> str:
        base = settings.BACKEND_URL.rstrip("/")
        # If running on Render or custom domain, ensure production scheme
        if "onrender.com" in base:
            return f"{base}/api/v1/webhooks/github"
        # Otherwise fallback to Render live URL if backend is localhost (useful for testing against cloud)
        if "localhost" in base or "127.0.0.1" in base:
            return "https://aegis-platform-wwgp.onrender.com/api/v1/webhooks/github"
        return f"{base}/api/v1/webhooks/github"

    @classmethod
    async def install_repository_webhook(
        cls,
        github_token: str,
        repo_full_name: str,
        webhook_secret: str,
    ) -> Tuple[bool, str]:
        """
        Registers Aegis Webhook on the specified GitHub repository using the user's OAuth token.
        Events subscribed: push, pull_request.
        """
        if not github_token:
            return False, "No GitHub OAuth credentials found"

        webhook_url = cls.get_webhook_url()
        api_url = f"https://api.github.com/repos/{repo_full_name}/hooks"

        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Aegis-Security-Platform",
        }
        payload = {
            "name": "web",
            "active": True,
            "events": ["push", "pull_request"],
            "config": {
                "url": webhook_url,
                "content_type": "json",
                "secret": webhook_secret,
                "insecure_ssl": "0",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(api_url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    logger.info(f"Successfully auto-installed GitHub webhook on {repo_full_name}")
                    return True, "Webhook installed and verified on GitHub"
                elif res.status_code == 422:
                    # Hook already exists on repository
                    logger.info(f"GitHub webhook already exists on {repo_full_name}")
                    return True, "Webhook is already configured on repository"
                elif res.status_code == 404:
                    return False, "Repository not found or OAuth token lacks 'repo' admin rights"
                else:
                    return False, f"GitHub API responded with code {res.status_code}: {res.text}"
        except Exception as exc:
            logger.error(f"Failed to install GitHub webhook on {repo_full_name}: {exc}")
            return False, str(exc)
