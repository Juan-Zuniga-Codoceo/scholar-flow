def send_replacement_notification(phone: str, message: str):
    """
    Mock service to simulate sending a WhatsApp message.
    In production, this would integrate with Twilio or Meta API.
    """
    print(f"\n📲 [MOCK WHATSAPP] Enviando a {phone}: {message}\n")
    return True
