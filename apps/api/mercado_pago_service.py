import os
import requests

class MercadoPagoService:
    def __init__(self):
        self.access_token = os.getenv("MP_ACCESS_TOKEN")
        self.api_url = os.getenv("MP_API_URL", "https://api.mercadopago.com")
        self.webhook_url = os.getenv("MP_WEBHOOK_URL")

    def create_payment(self, payment_data: dict) -> dict:
        """
        Creates a payment preference in Mercado Pago and returns the redirection URL.
        """
        try:
            commerce_order = payment_data.get("commerceOrder")
            subject = payment_data.get("subject")
            amount = payment_data.get("amount")
            email = payment_data.get("email")
            url_return = payment_data.get("urlReturn")

            # Mercado Pago requires secure HTTPS urls for back_urls validation.
            # If it starts with http://, we rewrite it to https://.
            if url_return and url_return.startswith("http://"):
                url_return = "https://" + url_return[7:]

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }

            # We use commerce_order as the token for back_urls redirect matching
            back_url_token = commerce_order

            # Create Mercado Pago Preference
            preference_payload = {
                "external_reference": commerce_order,
                "payer": {
                    "email": email
                },
                "items": [
                    {
                        "id": "subscription",
                        "title": subject,
                        "quantity": 1,
                        "unit_price": int(amount),
                        "currency_id": "CLP"
                    }
                ],
                "back_urls": {
                    "success": f"{url_return}?token={back_url_token}",
                    "failure": f"{url_return}?token={back_url_token}&status=failed",
                    "pending": f"{url_return}?token={back_url_token}&status=pending"
                },
                "auto_return": "approved"
            }

            # If webhook URL is set, specify it
            if self.webhook_url:
                preference_payload["notification_url"] = self.webhook_url

            # Make call to Mercado Pago REST API to create preference
            response = requests.post(
                f"{self.api_url}/checkout/preferences",
                json=preference_payload,
                headers=headers
            )

            if response.status_code not in (200, 201):
                print(f"Mercado Pago Preference Error: {response.text}")
                return {
                    "success": False,
                    "error": f"Error de Mercado Pago: {response.text}"
                }

            data = response.json()
            init_point = data.get("sandbox_init_point") or data.get("init_point")

            return {
                "success": True,
                "url": init_point,
                "token": back_url_token,
                "flowOrder": commerce_order
            }

        except Exception as e:
            print(f"Error al crear preferencia en Mercado Pago: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def get_payment_status(self, payment_id: str) -> dict:
        """
        Fetches payment status from Mercado Pago REST API using the payment ID.
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }

            response = requests.get(
                f"{self.api_url}/v1/payments/{payment_id}",
                headers=headers
            )

            if response.status_code != 200:
                print(f"Mercado Pago getPayment Error: {response.text}")
                return {
                    "success": False,
                    "error": response.text
                }

            data = response.json()
            # Map Mercado Pago status to flow equivalent status for compatibility
            # Flow status: 2 = Pagado (approved), 3 = Rejected, 4 = Cancelled
            mp_status = data.get("status")
            status_code = 1 # pending
            if mp_status == "approved":
                status_code = 2
            elif mp_status == "rejected":
                status_code = 3
            elif mp_status in ("cancelled", "refunded", "charged_back"):
                status_code = 4

            return {
                "success": True,
                "data": {
                    "commerceOrder": data.get("external_reference"),
                    "status": status_code,
                    "mp_status": mp_status,
                    "payment_id": payment_id
                }
            }

        except Exception as e:
            print(f"Error al obtener estado de pago de Mercado Pago: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
