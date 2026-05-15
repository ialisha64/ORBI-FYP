import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from core.config import settings


def _build_verification_html(name: str, verify_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0A0A1A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0F1128,#151A3A);border-radius:20px;border:1px solid rgba(108,99,255,0.3);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 24px;background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,217,255,0.08));">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#00D9FF);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:36px;">🤖</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:2px;">ORBI</h1>
              <p style="margin:4px 0 0;color:#00D9FF;font-size:13px;letter-spacing:1px;">AI Virtual Assistant</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:22px;font-weight:600;">
                Welcome, {name}! 👋
              </h2>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;">
                Thanks for signing up with Orbi. Please confirm your email address to activate your account and start chatting with your AI assistant.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="{verify_url}"
                       style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#6C63FF,#00D9FF);color:#ffffff;text-decoration:none;border-radius:50px;font-size:15px;font-weight:600;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,99,255,0.4);">
                      ✓ &nbsp; Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:13px;text-align:center;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;color:#6C63FF;font-size:12px;text-align:center;background:rgba(108,99,255,0.1);padding:12px;border-radius:8px;">
                {verify_url}
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px;">

              <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
                This link expires in <strong style="color:rgba(255,255,255,0.5);">24 hours</strong>.
                If you didn't create an Orbi account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px;background:rgba(0,0,0,0.2);">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;">
                © 2026 Orbi AI · Built with ❤️
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _send_email_sync(to_email: str, to_name: str, subject: str, html_body: str):
    """Synchronous SMTP send — runs in a thread pool."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def send_verification_email(to_email: str, to_name: str, token: str):
    """Send account verification email asynchronously."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] SMTP not configured. Verification link: "
              f"{settings.FRONTEND_URL}/#/verify-email?token={token}")
        return

    verify_url = f"{settings.FRONTEND_URL}/?token={token}#/verify-email"
    html = _build_verification_html(to_name, verify_url)

    loop = asyncio.get_running_loop()
    try:
        await asyncio.wait_for(
            loop.run_in_executor(
                None,
                _send_email_sync,
                to_email,
                to_name,
                f"Verify your Orbi account, {to_name}!",
                html,
            ),
            timeout=15,
        )
        print(f"[Email] Verification email sent to {to_email}")
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")


def _build_reset_html(name: str, reset_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0A0A1A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0F1128,#151A3A);border-radius:20px;border:1px solid rgba(108,99,255,0.3);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 24px;background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,217,255,0.08));">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#00D9FF);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:36px;">🔒</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:2px;">ORBI</h1>
              <p style="margin:4px 0 0;color:#00D9FF;font-size:13px;letter-spacing:1px;">AI Virtual Assistant</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:22px;font-weight:600;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;">
                Hi <strong style="color:#ffffff;">{name}</strong>,
              </p>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;">
                We received a request to reset your Orbi password. Click the button below to choose a new password.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="{reset_url}"
                       style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#6C63FF,#00D9FF);color:#ffffff;text-decoration:none;border-radius:50px;font-size:15px;font-weight:600;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,99,255,0.4);">
                      🔑 &nbsp; Reset My Password
                    </a>
                  </td>
                  
                </tr>
              </table>

              <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:13px;text-align:center;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;color:#6C63FF;font-size:12px;text-align:center;background:rgba(108,99,255,0.1);padding:12px;border-radius:8px;">
                {reset_url}
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px;">

              <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;">
                This link expires in <strong style="color:rgba(255,255,255,0.5);">1 hour</strong>.
                If you didn't request a password reset, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px;background:rgba(0,0,0,0.2);">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;">
                © 2026 Orbi AI · Built with ❤️
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


async def send_password_reset_email(to_email: str, to_name: str, token: str):
    """Send password reset email asynchronously."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] SMTP not configured. Reset link: "
              f"{settings.FRONTEND_URL}/#/reset-password?token={token}")
        return

    reset_url = f"{settings.FRONTEND_URL}/?token={token}#/reset-password"
    html = _build_reset_html(to_name, reset_url)

    loop = asyncio.get_running_loop()
    try:
        await asyncio.wait_for(
            loop.run_in_executor(
                None,
                _send_email_sync,
                to_email,
                to_name,
                "Reset your Orbi password",
                html,
            ),
            timeout=15,
        )
        print(f"[Email] Password reset email sent to {to_email}")
    except Exception as e:
        print(f"[Email] Failed to send reset email to {to_email}: {e}")
