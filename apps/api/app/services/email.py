import logging
from typing import Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("aegis.email")


class EmailService:
    """
    Transactional email delivery service using the Resend API with an Apple-inspired
    minimalist design system and a robust development/test fallback.
    """

    @staticmethod
    def _build_otp_email_html(otp: str, user_email: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Aegis Platform account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fbfbfd; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1d1d1f;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520px" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e5e7; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); overflow: hidden; padding: 40px 36px;">
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 38px; height: 38px; background-color: #000000; border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 700; font-size: 18px;">
                    🛡️
                  </td>
                  <td style="padding-left: 12px; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #000000;">
                    Aegis Platform
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: #111827;">Confirm your email address</h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td align="center" style="padding-bottom: 28px; color: #6b7280; font-size: 14px; line-height: 1.5;">
              Use the single-use 6-digit verification code below to activate your Aegis workspace for <strong style="color: #111827;">{user_email}</strong>.
            </td>
          </tr>

          <!-- 6-digit OTP Box -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <div style="display: inline-block; background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 18px 28px; letter-spacing: 0.35em; font-family: 'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; color: #09090b;">
                {otp}
              </div>
            </td>
          </tr>

          <!-- Expiration Notice -->
          <tr>
            <td align="center" style="padding-bottom: 28px; color: #71717a; font-size: 13px;">
              This code will expire in <strong>10 minutes</strong> and can only be used once.
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #f4f4f5; padding-top: 24px;"></td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td align="center" style="color: #a1a1aa; font-size: 12px; line-height: 1.5;">
              If you didn't create an account with Aegis Platform, you can safely ignore this email.
              <br>© Aegis Security Inc. Continuous DevSecOps Intelligence.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    @staticmethod
    def _build_password_reset_email_html(reset_url: str, user_email: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Aegis Platform password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fbfbfd; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1d1d1f;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520px" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e5e7; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); overflow: hidden; padding: 40px 36px;">
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 38px; height: 38px; background-color: #000000; border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 700; font-size: 18px;">
                    🛡️
                  </td>
                  <td style="padding-left: 12px; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #000000;">
                    Aegis Platform
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: #111827;">Reset your password</h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td align="center" style="padding-bottom: 28px; color: #6b7280; font-size: 14px; line-height: 1.5;">
              We received a request to reset the password associated with <strong style="color: #111827;">{user_email}</strong>. Click the button below to choose a new password.
            </td>
          </tr>

          <!-- Reset CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="{reset_url}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 980px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); letter-spacing: -0.01em;">
                Reset Password
              </a>
            </td>
          </tr>

          <!-- Expiration Notice & Fallback -->
          <tr>
            <td align="center" style="padding-bottom: 24px; color: #71717a; font-size: 13px; line-height: 1.5;">
              This password reset link is strictly valid for <strong>15 minutes</strong> and can only be used once.
              <br><br>
              If the button above does not work, copy and paste this URL into your browser:
              <br>
              <a href="{reset_url}" style="color: #3b82f6; font-size: 11px; word-break: break-all; text-decoration: none;">{reset_url}</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #f4f4f5; padding-top: 24px;"></td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td align="center" style="color: #a1a1aa; font-size: 12px; line-height: 1.5;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              <br>© Aegis Security Inc. Continuous DevSecOps Intelligence.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    @classmethod
    async def send_email(cls, to_email: str, subject: str, html_content: str) -> bool:
        """
        Sends an email using the Resend HTTP API.
        Gracefully logs and succeeds if RESEND_API_KEY is not configured (e.g. during dev/tests).
        """
        api_key = settings.RESEND_API_KEY.strip()
        if not api_key or api_key.startswith("test_") or api_key == "mock":
            logger.info(
                f"[EMAIL-DEV-MOCK] To: {to_email} | Subject: '{subject}' | Key unconfigured/mock"
            )
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.EMAIL_FROM,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    },
                )
                if response.status_code in (200, 201):
                    logger.info(f"Successfully sent email to {to_email} via Resend")
                    return True
                else:
                    logger.error(
                        f"Failed to send email via Resend: {response.status_code} - {response.text}"
                    )
                    return False
        except Exception as exc:
            logger.error(f"Resend HTTP request exception for {to_email}: {exc}")
            return False

    @classmethod
    async def send_verification_otp(cls, to_email: str, otp: str) -> bool:
        subject = f"Verify your Aegis Platform account ({otp})"
        html = cls._build_otp_email_html(otp=otp, user_email=to_email)
        return await cls.send_email(to_email, subject, html)

    @classmethod
    async def send_password_reset(cls, to_email: str, reset_token: str) -> bool:
        subject = "Reset your Aegis Platform password"
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}"
        html = cls._build_password_reset_email_html(reset_url=reset_url, user_email=to_email)
        return await cls.send_email(to_email, subject, html)
