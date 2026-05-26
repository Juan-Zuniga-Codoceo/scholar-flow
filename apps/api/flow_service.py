import os
import hmac
import hashlib
import requests
import urllib.parse

class FlowService:
    def __init__(self):
        self.api_key = os.getenv("FLOW_API_KEY")
        self.secret_key = os.getenv("FLOW_SECRET_KEY")
        self.api_url = os.getenv("FLOW_API_URL", "https://sandbox.flow.cl/api")
        self.webhook_url = os.getenv("FLOW_WEBHOOK_URL")

    def generate_signature(self, params: dict) -> str:
        # Sort keys alphabetically
        sorted_keys = sorted(params.keys())
        # Concatenate key and value
        concat_str = "".join(f"{key}{params[key]}" for key in sorted_keys if params[key] is not None)
        print(f"[Flow Debug] Concat Str: {concat_str}")
        
        # Calculate HMAC-SHA256 signature
        signature = hmac.new(
            self.secret_key.encode("utf-8"),
            concat_str.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        return signature

    def validate_signature(self, params: dict, received_signature: str) -> bool:
        calculated = self.generate_signature(params)
        return calculated == received_signature

    def create_payment(self, payment_data: dict) -> dict:
        try:
            commerce_order = payment_data.get("commerceOrder")
            subject = payment_data.get("subject")
            amount = payment_data.get("amount")
            email = payment_data.get("email")
            url_return = payment_data.get("urlReturn")
            url_confirmation = payment_data.get("urlConfirmation") or self.webhook_url

            # Base parameters
            params = {
                "apiKey": self.api_key,
                "commerceOrder": commerce_order,
                "subject": subject,
                "currency": "CLP",
                "amount": int(amount),
                "email": email,
                "urlConfirmation": url_confirmation,
                "urlReturn": url_return
            }

            # Generate signature
            print(f"[Flow Debug] Raw Params: {params}")
            params["s"] = self.generate_signature(params)
            print(f"[Flow Debug] Final Signed Params: {params}")

            # Make request using URL query parameters encoded with %20 instead of + in the body
            query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = requests.post(f"{self.api_url}/payment/create", data=query_string, headers=headers)
            
            # Debug log
            if response.status_code != 200:
                print(f"Flow error response: {response.text}")
                try:
                    err_msg = response.json().get("message", "Error de respuesta en Flow")
                except:
                    err_msg = response.text
                return {
                    "success": False,
                    "error": err_msg
                }

            data = response.json()
            if "url" in data and "token" in data:
                return {
                    "success": True,
                    "url": f"{data['url']}?token={data['token']}",
                    "token": data["token"],
                    "flowOrder": data.get("flowOrder")
                }
            else:
                return {
                    "success": False,
                    "error": "Respuesta inválida de Flow"
                }

        except Exception as e:
            print(f"Error al crear pago en Flow: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def get_payment_status(self, token: str) -> dict:
        try:
            params = {
                "apiKey": self.api_key,
                "token": token
            }
            params["s"] = self.generate_signature(params)

            query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
            response = requests.get(f"{self.api_url}/payment/getStatus?{query_string}")
            if response.status_code != 200:
                print(f"Flow getStatus error: {response.text}")
                return {
                    "success": False,
                    "error": response.text
                }

            return {
                "success": True,
                "data": response.json()
            }
        except Exception as e:
            print(f"Error al obtener estado de pago: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
