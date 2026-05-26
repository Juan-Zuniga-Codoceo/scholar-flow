import os
import sys

# Ensure apps/api directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from db import get_db_connection, execute_query_one
from auth import create_access_token

client = TestClient(app)

def test_billing_flow():
    print("🚀 Iniciando pruebas del sistema de suscripción SaaS...")
    
    # 1. Obtener o crear una organización y un usuario de prueba en la base de datos
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Limpiar pagos previos si existen
            cur.execute("DELETE FROM payments")
            
            # Obtener organización de prueba o crear una
            cur.execute("SELECT id FROM organizations WHERE subdomain = 'orgtest'")
            org_row = cur.fetchone()
            if org_row:
                org_id = org_row[0]
            else:
                cur.execute(
                    "INSERT INTO organizations (name, subdomain) VALUES ('Org Test', 'orgtest') RETURNING id"
                )
                org_id = cur.fetchone()[0]
                
            # Obtener usuario admin demo o crear uno
            cur.execute("SELECT id, email FROM users WHERE organization_id = %s LIMIT 1", (org_id,))
            user_row = cur.fetchone()
            if user_row:
                user_id, user_email = user_row[0], user_row[1]
            else:
                user_email = "admin@orgtest.scholarflow.app"
                cur.execute(
                    "INSERT INTO users (email, password_hash, role, organization_id) VALUES (%s, 'hash', 'admin', %s) RETURNING id",
                    (user_email, org_id)
                )
                user_id = cur.fetchone()[0]

    print(f"✅ Organización de prueba ID: {org_id}")
    print(f"✅ Usuario de prueba Email: {user_email}")

    # 2. Generar token de acceso para la API
    token_data = {
        "sub": str(user_id),
        "email": user_email,
        "role": "admin",
        "org_id": str(org_id),
        "org_name": "Org Test",
        "subdomain": "orgtest"
    }
    access_token = create_access_token(token_data)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Probar GET /billing/status
    print("🔹 Probando GET /billing/status...")
    res = client.get("/billing/status", headers=headers)
    assert res.status_code == 200, f"Error en billing status: {res.text}"
    status_data = res.json()
    print(f"👉 Estado de Suscripción: {status_data['subscription_status']}")
    print(f"👉 Usuarios Activos: {status_data['active_users']}")
    print(f"👉 Monto Mensual: {status_data['total_monthly_amount']}")

    # 4. Probar POST /billing/pay
    print("🔹 Probando POST /billing/pay...")
    pay_payload = {"url_return": "http://localhost:3000/dashboard/suscripcion/retorno"}
    res = client.post("/billing/pay", json=pay_payload, headers=headers)
    assert res.status_code == 200, f"Error en billing pay: {res.text}"
    pay_data = res.json()
    assert pay_data["success"] is True, f"Fallo al crear pago: {pay_data}"
    assert "payment_url" in pay_data, "Falta URL de pago"
    print(f"👉 Enlace de Pago Generado: {pay_data['payment_url']}")

    # Obtener el token generado en la base de datos
    db_payment = execute_query_one(
        "SELECT flow_token, flow_order FROM payments WHERE organization_id = %s AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        (org_id,)
    )
    assert db_payment is not None, "El pago no fue insertado en la base de datos"
    flow_token = db_payment["flow_token"]
    flow_order = db_payment["flow_order"]
    print(f"👉 Flow Token en DB: {flow_token}")
    print(f"👉 Flow Order en DB: {flow_order}")

    # 5. Simular llamada al Webhook de Mercado Pago
    print("🔹 Simulando llamada del Webhook de Mercado Pago...")
    
    from mercado_pago_service import MercadoPagoService
    original_get_status = MercadoPagoService.get_payment_status
    
    def mock_get_payment_status(self, payment_id):
        return {
            "success": True,
            "data": {
                "commerceOrder": flow_order,
                "status": 2, # Pagado (approved)
                "mp_status": "approved",
                "payment_id": payment_id
            }
        }
    MercadoPagoService.get_payment_status = mock_get_payment_status

    webhook_payload = {
        "type": "payment",
        "data": {
            "id": "mock_mp_payment_555"
        }
    }
    res = client.post("/billing/webhook", json=webhook_payload)
    assert res.status_code == 200, f"Error en webhook: {res.text}"
    print("👉 Webhook de Mercado Pago procesado exitosamente")

    # Restaurar la función original
    MercadoPagoService.get_payment_status = original_get_status

    # 6. Verificar en base de datos si la organización se renovó a 'active' y el pago se completó
    print("🔹 Verificando actualización de base de datos...")
    updated_org = execute_query_one(
        "SELECT subscription_status, subscription_ends_at FROM organizations WHERE id = %s",
        (org_id,)
    )
    assert updated_org["subscription_status"] == "active", f"La organización no está activa: {updated_org}"
    assert updated_org["subscription_ends_at"] is not None, "Fecha de fin de suscripción no establecida"
    
    updated_payment = execute_query_one(
        "SELECT status, paid_at FROM payments WHERE flow_order = %s",
        (flow_order,)
    )
    assert updated_payment["status"] == "completed", f"El pago no está completado: {updated_payment}"
    assert updated_payment["paid_at"] is not None, "Fecha de pago no registrada"

    print("🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! 🎉")

if __name__ == "__main__":
    test_billing_flow()
