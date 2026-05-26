import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load config from env with safe defaults
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@scholarflow.cl")

def send_email(to_email: str, subject: str, body_html: str, body_text: str = "") -> bool:
    """
    Sends an email using standard smtplib.
    If credentials are not configured, it acts as a mock/logger service to avoid failure.
    """
    print(f"\n📧 [EMAIL SERVICE] Intentando enviar correo a: {to_email}")
    print(f"   Asunto: {subject}")
    print(f"   Cuerpo de Texto: {body_text or body_html[:100]}...")

    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️ [MOCK EMAIL] Credenciales SMTP no configuradas. Correo simulado exitosamente en consola.\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        if body_text:
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
        server.close()

        print("✅ [EMAIL SERVICE] Correo enviado exitosamente via SMTP.")
        return True
    except Exception as e:
        print(f"❌ [EMAIL SERVICE] Error al enviar correo via SMTP: {e}")
        return False
