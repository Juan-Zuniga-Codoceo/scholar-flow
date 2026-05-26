import os
import io
import json
import traceback
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from schemas import (
    MedicalLicense, AssignmentRequest, 
    ProfessorCreate, ProfessorUpdate, 
    CourseCreate, CourseUpdate, 
    CourseSubjectCreate, CourseSubjectUpdate,
    ScheduleSlotCreate, ScheduleSlotBatch,
    OptimizeRequest,
    OrganizationRegister, UserLogin, TokenResponse, UserInfo, OrgInfo,
    ProfessorInvite, ProfessorProfileUpdate, ProfessorProfile,
    LeaveRequestCreate, LeaveRequestReview,
    AgendaItemCreate, AgendaItemUpdate, AgendaItemResponse,
    ExportScheduleRequest,
    BillingStatusResponse, PaySubscriptionRequest, PaySubscriptionResponse,
    ChatQuery, SearchQuery, OrganizationUpdate,
    ForgotPasswordRequest, ResetPasswordRequest
)
from fastapi.security import OAuth2PasswordBearer
from auth import get_password_hash, verify_password, create_access_token, decode_access_token
from dotenv import load_dotenv
from db import get_db_connection, execute_query, execute_query_one
from services.whatsapp import send_replacement_notification
from services.email import send_email

# Load environment variables from .env file with explicit path
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Initialize FastAPI
app = FastAPI(title="Synapse AI Engine")

from fastapi.staticfiles import StaticFiles
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Configuration
origins = [
    "http://localhost:3000",
    # Add wildcard or pattern matching for subdomains later in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local subdomain dev, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Configuration - Validate API Key at startup
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("\n" + "="*60)
    print("❌ GOOGLE_API_KEY no está configurada en .env")
    print("="*60 + "\n")
    raise ValueError("GOOGLE_API_KEY is required but not found in environment")

genai.configure(api_key=api_key)

# Use Gemini Flash Latest
MODEL_NAME = "models/gemini-flash-latest"

SYSTEM_PROMPT = """
Eres un asistente administrativo escolar. Tu tarea es procesar licencias médicas adjuntas en formato PDF o Imagen.
Extrae EXCLUSIVAMENTE los siguientes campos en formato JSON estricto, respetando este esquema:
{
  "nombre_profesor": "string",
  "rut_profesor": "string",
  "diagnostico_codigo": "string | null", 
  "dias_reposo": int,
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "emitido_por": "string"
}
Si el documento NO es una licencia médica legible o válida, o si faltan datos críticos, retorna un JSON con los campos nulos o un error explicativo en una estructura alternativa, pero intenta extraer lo máximo posible.
Prioriza la privacidad: Si 'diagnostico_codigo' no es claro, déjalo nulo.
"""

def get_organization_id_from_host(request: Request) -> str:
    """
    Dependency to resolve organization_id dynamically from Host subdomain header.
    Matches the multi-tenant architecture used in Operia.
    """
    host = request.headers.get("host", "")
    x_forwarded_host = request.headers.get("x-forwarded-host", "")
    actual_host = x_forwarded_host or host
    
    # Extract subdomain (e.g., demo.localhost:3000 -> demo)
    parts = actual_host.split(".")
    subdomain = "demo" # fallback default for development
    
    if len(parts) >= 2:
        first_part = parts[0].split(":")[0] # remove port
        reserved = ["www", "api", "app", "localhost", "127"]
        if first_part.lower() not in reserved:
            subdomain = first_part
            
    # Query DB to find organization_id
    org = execute_query_one("SELECT id FROM organizations WHERE subdomain = %s", (subdomain,))
    if org:
        return str(org['id'])
    
    # Fallback to default demo organization ID
    return "00000000-0000-0000-0000-000000000000"

@app.get("/")
def read_root():
    return {"status": "active", "service": "Synapse Scholar-Flow AI Engine (PostgreSQL Mode)"}

@app.post("/extract-license", response_model=MedicalLicense)
async def extract_license(file: UploadFile = File(...)):
    if not file.filename.endswith((".pdf", ".jpg", ".jpeg", ".png")):
         raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or Image.")

    try:
        content = await file.read()
        mime_type = file.content_type or "application/pdf"

        # Save original file to uploads directory
        import uuid
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        saved_path = os.path.join("uploads", unique_filename)
        with open(saved_path, "wb") as f:
            f.write(content)

        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_PROMPT,
            generation_config=generation_config
        )

        response = model.generate_content(
            [
                {"mime_type": mime_type, "data": content},
                "Extract data from this medical license."
            ]
        )

        try:
            json_data = json.loads(response.text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned invalid JSON structure.")

        validated_data = MedicalLicense(**json_data)
        validated_data.file_path = f"/uploads/{unique_filename}"
        return validated_data

    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR EN /extract-license:")
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=f"Error procesando licencia: {str(e)}")

@app.post("/licenses")
async def create_license(license: MedicalLicense, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        # Map Pydantic schema to Database Schema
        data = license.model_dump()
        
        # Helper to serialize dates
        def serialize_date(d):
            return d.isoformat() if hasattr(d, 'isoformat') else d

        start_date = serialize_date(data['fecha_inicio'])
        end_date = serialize_date(data['fecha_fin'])

        # Insert license into local PostgreSQL database
        query = """
            INSERT INTO medical_licenses (
                organization_id, professor_name, professor_rut, days_count, 
                start_date, end_date, health_entity, diagnosis_code, status, file_path
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending_replacement', %s)
            RETURNING id, organization_id, professor_name, professor_rut, days_count, start_date, end_date, health_entity, diagnosis_code, status, replacement_professor_id, file_path, created_at;
        """
        params = (
            organization_id,
            data['nombre_profesor'],
            data['rut_profesor'],
            data['dias_reposo'],
            start_date,
            end_date,
            data['emitido_por'],
            data.get('diagnostico_codigo'),
            data.get('file_path'),
        )
        
        created_license = execute_query_one(query, params)
        if not created_license:
            raise HTTPException(status_code=500, detail="Failed to insert medical license.")

        # Serialize fields for response
        created_license['id'] = str(created_license['id'])
        created_license['organization_id'] = str(created_license['organization_id'])
        created_license['start_date'] = str(created_license['start_date'])
        created_license['end_date'] = str(created_license['end_date'])
        created_license['created_at'] = str(created_license['created_at'])
        created_license['file_path'] = created_license.get('file_path')

        # Notify organization admin about the new medical license upload
        admin = execute_query_one(
            "SELECT id, email, full_name FROM users WHERE organization_id = %s AND role = 'admin' LIMIT 1",
            (organization_id,)
        )
        if admin and admin.get('email'):
            subject = "Nueva Licencia Médica Cargada"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Alerta de Licencia Médica Recibida</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{admin['full_name']}</strong>,</p>
                            <p>Se ha registrado una nueva licencia médica en la plataforma:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Docente afectado:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{data['nombre_profesor']} (RUT: {data['rut_profesor']})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Días de Reposo:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{data['dias_reposo']} días</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Desde:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{start_date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Hasta:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{end_date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Entidad de Salud:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{data['emitido_por']}</td>
                                </tr>
                            </table>
                            <p style="font-size: 13px; color: #64748b;">Nuestra IA ya ha procesado la licencia y ha pre-seleccionado candidatos idóneos para el reemplazo docente.</p>
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="http://localhost:3000/dashboard/licencias" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Asignar Reemplazo</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            Este es un correo automático generado por Scholar-Flow.
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(admin["email"], subject, html, f"Se ha cargado una nueva licencia médica para {data['nombre_profesor']} por {data['dias_reposo']} días.")

        # 5. Execute Replacement Matching Logic
        matches = []
        try:
            # A. Find the absent professor to get their subjects
            absent_prof = execute_query_one(
                "SELECT * FROM professors WHERE organization_id = %s AND rut = %s",
                (organization_id, data['rut_profesor'])
            )
            
            if absent_prof:
                absent_subjects = set(absent_prof.get('subjects', []) or [])

                if absent_subjects:
                    # B. Find available substitutes in the same organization
                    candidates = execute_query(
                        "SELECT * FROM professors WHERE organization_id = %s AND id != %s AND is_available = true",
                        (organization_id, absent_prof['id']),
                        fetch=True
                    )
                    
                    for cand in candidates:
                        cand_subjects = set(cand.get('subjects', []) or [])
                        # Check for intersection
                        if not absent_subjects.isdisjoint(cand_subjects):
                            contract_hours = cand.get('contract_hours') or 44
                            assigned_hours = cand.get('assigned_hours') or 0
                            available_hours = contract_hours - assigned_hours
                            
                            matches.append({
                                "id": str(cand['id']),
                                "full_name": cand['full_name'],
                                "rut": cand['rut'],
                                "subjects": cand.get('subjects') or [],
                                "contract_hours": contract_hours,
                                "assigned_hours": assigned_hours,
                                "available_hours": available_hours,
                                "contract_type": cand.get('contract_type', 'planta')
                            })
                    
                    # Sort candidates: prioritize those with more available hours
                    matches.sort(key=lambda x: x['available_hours'], reverse=True)
            
            print(f"✅ Match Algorithm: Found {len(matches)} candidates for {data['rut_profesor']}")

        except Exception as match_error:
            print(f"⚠️ Match Algorithm Failed: {match_error}")
            traceback.print_exc()
        
        return {
            "status": "success", 
            "id": created_license['id'], 
            "data": created_license,
            "matches": matches
        }

    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR EN /licenses:")
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/licenses")
async def get_licenses(organization_id: str = Depends(get_organization_id_from_host)):
    try:
        licenses = execute_query(
            """
            SELECT ml.*, p.full_name as replacement_name 
            FROM medical_licenses ml
            LEFT JOIN professors p ON ml.replacement_professor_id = p.id
            WHERE ml.organization_id = %s 
            ORDER BY ml.created_at DESC
            """,
            (organization_id,),
            fetch=True
        )
        
        # Serialize fields for response
        for lic in licenses:
            lic['id'] = str(lic['id'])
            lic['organization_id'] = str(lic['organization_id'])
            lic['user_id'] = str(lic['user_id']) if lic.get('user_id') else None
            lic['replacement_professor_id'] = str(lic['replacement_professor_id']) if lic.get('replacement_professor_id') else None
            lic['start_date'] = str(lic['start_date'])
            lic['end_date'] = str(lic['end_date'])
            lic['created_at'] = str(lic['created_at'])
            lic['replacement_name'] = lic.get('replacement_name')
            
        return licenses

    except Exception as e:
        print(f"❌ Error fetching licenses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/licenses/{license_id}/assign")
async def assign_replacement(license_id: str, request: AssignmentRequest):
    try:
        professor_id = request.professor_id
        
        # 1. Update the license status and replacement_professor_id
        updated = execute_query_one(
            "UPDATE medical_licenses SET status = 'covered', replacement_professor_id = %s WHERE id = %s RETURNING id, status, replacement_professor_id",
            (professor_id, license_id)
        )
        
        if not updated:
            raise HTTPException(status_code=404, detail="License not found")

        # 2. Get Professor and License Details for Notification
        prof = execute_query_one("SELECT * FROM professors WHERE id = %s", (professor_id,))
        license_rec = execute_query_one("SELECT * FROM medical_licenses WHERE id = %s", (license_id,))
        if prof and license_rec:
            # WhatsApp notification
            phone = prof.get('phone') or "+56912345678" 
            message = f"Hola {prof['full_name']}, se te ha asignado un reemplazo para {license_rec['professor_name']}. Por favor revisa tu portal."
            send_replacement_notification(phone, message)
            
            # Email notification
            if prof.get('email'):
                subject = "Asignación de Reemplazo Docente"
                html = f"""
                <html>
                    <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <div style="background: linear-gradient(to right, #0d9488, #0f766e); padding: 24px; color: white;">
                                <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                                <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Asignación de Horas / Reemplazo</p>
                            </div>
                            <div style="padding: 24px; background: white;">
                                <p>Hola <strong>{prof['full_name']}</strong>,</p>
                                <p>Te informamos que se te ha asignado un reemplazo docente en el establecimiento:</p>
                                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Docente Ausente:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">{license_rec['professor_name']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Fecha Inicio:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">{license_rec['start_date']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Fecha Fin:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">{license_rec['end_date']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Días Totales:</td>
                                        <td style="padding: 8px 0; color: #1e293b;">{license_rec['days_count']} días</td>
                                    </tr>
                                </table>
                                <p style="font-size: 13px; color: #64748b;">Por favor ingresa a tu Portal Docente para ver los detalles de tus nuevos horarios y ramos asignados.</p>
                                <div style="margin-top: 24px; text-align: center;">
                                    <a href="http://localhost:3000/profesor/ramos" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver mis Asignaturas</a>
                                </div>
                            </div>
                            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                                Este es un correo automático generado por Scholar-Flow.
                            </div>
                        </div>
                    </body>
                </html>
                """
                send_email(prof['email'], subject, html, f"Hola {prof['full_name']}, se te ha asignado un reemplazo docente de {license_rec['days_count']} días para {license_rec['professor_name']}.")

        return {"status": "success", "message": "Reemplazo asignado y notificado"}

    except Exception as e:
        print(f"❌ Error assigning replacement: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/licenses/{license_id}/candidates")
async def get_license_candidates(license_id: str, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        # Get the license
        license_rec = execute_query_one(
            "SELECT * FROM medical_licenses WHERE id = %s AND organization_id = %s",
            (license_id, organization_id)
        )
        if not license_rec:
            raise HTTPException(status_code=404, detail="License not found")
            
        # Find the absent professor to get their subjects
        absent_prof = execute_query_one(
            "SELECT * FROM professors WHERE organization_id = %s AND rut = %s",
            (organization_id, license_rec['professor_rut'])
        )
        
        matches = []
        if absent_prof:
            absent_subjects = set(absent_prof.get('subjects', []) or [])
            if absent_subjects:
                candidates = execute_query(
                    "SELECT * FROM professors WHERE organization_id = %s AND id != %s AND is_available = true",
                    (organization_id, absent_prof['id']),
                    fetch=True
                )
                
                for cand in candidates:
                    cand_subjects = set(cand.get('subjects', []) or [])
                    # Check if there is any intersection of subjects
                    if not absent_subjects.isdisjoint(cand_subjects):
                        contract_hours = cand.get('contract_hours') or 44
                        assigned_hours = cand.get('assigned_hours') or 0
                        available_hours = contract_hours - assigned_hours
                        
                        matches.append({
                            "id": str(cand['id']),
                            "full_name": cand['full_name'],
                            "rut": cand['rut'],
                            "subjects": cand.get('subjects') or [],
                            "contract_hours": contract_hours,
                            "assigned_hours": assigned_hours,
                            "available_hours": available_hours,
                            "contract_type": cand.get('contract_type', 'planta')
                        })
                # Sort candidates: prioritize those with more available hours
                matches.sort(key=lambda x: x['available_hours'], reverse=True)
        
        return matches

    except Exception as e:
        print(f"❌ Error getting license candidates: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- PROFESSORS CRUD ---

@app.get("/professors")
async def get_professors(organization_id: str = Depends(get_organization_id_from_host)):
    try:
        professors = execute_query(
            "SELECT * FROM professors WHERE organization_id = %s ORDER BY full_name ASC",
            (organization_id,),
            fetch=True
        )
        for p in professors:
            p['id'] = str(p['id'])
            p['organization_id'] = str(p['organization_id'])
        return professors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/professors")
async def create_professor(prof: ProfessorCreate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        query = """
            INSERT INTO professors (
                organization_id, rut, full_name, subjects, contract_hours, contract_type, assigned_hours, is_available, email, phone
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """
        params = (
            organization_id, prof.rut, prof.full_name, prof.subjects,
            prof.contract_hours, prof.contract_type, prof.assigned_hours, prof.is_available,
            prof.email, prof.phone
        )
        created = execute_query_one(query, params)
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create professor")
        created['id'] = str(created['id'])
        created['organization_id'] = str(created['organization_id'])
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/professors/{prof_id}")
async def update_professor(prof_id: str, prof: ProfessorUpdate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        update_fields = []
        params = []
        data = prof.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        for k, v in data.items():
            update_fields.append(f"{k} = %s")
            params.append(v)
            
        params.extend([prof_id, organization_id])
        query = f"UPDATE professors SET {', '.join(update_fields)} WHERE id = %s AND organization_id = %s RETURNING *;"
        updated = execute_query_one(query, params)
        if not updated:
            raise HTTPException(status_code=404, detail="Professor not found")
        updated['id'] = str(updated['id'])
        updated['organization_id'] = str(updated['organization_id'])
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/professors/{prof_id}")
async def delete_professor(prof_id: str, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        deleted = execute_query_one(
            "DELETE FROM professors WHERE id = %s AND organization_id = %s RETURNING id",
            (prof_id, organization_id)
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Professor not found")
        return {"status": "success", "id": str(deleted['id'])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# --- COURSES CRUD ---

@app.get("/courses")
async def get_courses(organization_id: str = Depends(get_organization_id_from_host)):
    try:
        courses = execute_query(
            "SELECT * FROM courses WHERE organization_id = %s ORDER BY name ASC",
            (organization_id,),
            fetch=True
        )
        for c in courses:
            c['id'] = str(c['id'])
            c['organization_id'] = str(c['organization_id'])
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/courses")
async def create_course(course: CourseCreate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        created = execute_query_one(
            "INSERT INTO courses (organization_id, name) VALUES (%s, %s) RETURNING *;",
            (organization_id, course.name)
        )
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create course")
        created['id'] = str(created['id'])
        created['organization_id'] = str(created['organization_id'])
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/courses/{course_id}")
async def update_course(course_id: str, course: CourseUpdate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        updated = execute_query_one(
            "UPDATE courses SET name = %s WHERE id = %s AND organization_id = %s RETURNING *;",
            (course.name, course_id, organization_id)
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Course not found")
        updated['id'] = str(updated['id'])
        updated['organization_id'] = str(updated['organization_id'])
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/courses/{course_id}")
async def delete_course(course_id: str, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        deleted = execute_query_one(
            "DELETE FROM courses WHERE id = %s AND organization_id = %s RETURNING id",
            (course_id, organization_id)
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Course not found")
        return {"status": "success", "id": str(deleted['id'])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# --- COURSE SUBJECTS CRUD ---

@app.get("/course-subjects")
async def get_course_subjects(course_id: Optional[str] = None, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        if course_id:
            course = execute_query_one("SELECT id FROM courses WHERE id = %s AND organization_id = %s", (course_id, organization_id))
            if not course:
                raise HTTPException(status_code=404, detail="Course not found in this organization")
            
            subjects = execute_query(
                """
                SELECT cs.*, p.full_name as professor_name 
                FROM course_subjects cs
                LEFT JOIN professors p ON cs.professor_id = p.id
                WHERE cs.course_id = %s 
                ORDER BY cs.subject_name ASC
                """,
                (course_id,),
                fetch=True
            )
        else:
            subjects = execute_query(
                """
                SELECT cs.*, p.full_name as professor_name, c.name as course_name
                FROM course_subjects cs
                JOIN courses c ON cs.course_id = c.id
                LEFT JOIN professors p ON cs.professor_id = p.id
                WHERE c.organization_id = %s 
                ORDER BY c.name ASC, cs.subject_name ASC
                """,
                (organization_id,),
                fetch=True
            )
            
        for s in subjects:
            s['id'] = str(s['id'])
            s['course_id'] = str(s['course_id'])
            s['professor_id'] = str(s['professor_id']) if s.get('professor_id') else None
        return subjects
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/course-subjects")
async def create_course_subject(sub: CourseSubjectCreate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        course = execute_query_one("SELECT id FROM courses WHERE id = %s AND organization_id = %s", (sub.course_id, organization_id))
        if not course:
            raise HTTPException(status_code=404, detail="Course not found in this organization")

        prof = None
        if sub.professor_id:
            prof = execute_query_one("SELECT * FROM professors WHERE id = %s AND organization_id = %s", (sub.professor_id, organization_id))
            if not prof:
                raise HTTPException(status_code=404, detail="Professor not found in this organization")

        query = """
            INSERT INTO course_subjects (course_id, subject_name, weekly_hours, professor_id)
            VALUES (%s, %s, %s, %s)
            RETURNING *;
        """
        params = (sub.course_id, sub.subject_name, sub.weekly_hours, sub.professor_id)
        created = execute_query_one(query, params)
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create course subject mapping")
            
        created['id'] = str(created['id'])
        created['course_id'] = str(created['course_id'])
        created['professor_id'] = str(created['professor_id']) if created.get('professor_id') else None

        if sub.professor_id and prof and prof.get('email'):
            course_detail = execute_query_one("SELECT name FROM courses WHERE id = %s", (sub.course_id,))
            course_name = course_detail['name'] if course_detail else "Curso Desconocido"
            subject = "Asignación de Carga Horaria"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #0d9488, #0f766e); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Nueva Asignación de Asignatura</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{prof['full_name']}</strong>,</p>
                            <p>Se te ha asignado una nueva asignatura en la plataforma:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Curso:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{course_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Asignatura:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{sub.subject_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Horas Semanales:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{sub.weekly_hours} horas</td>
                                </tr>
                            </table>
                            <p style="font-size: 13px; color: #64748b;">Puedes ingresar a tu Portal Docente para ver los detalles de tu horario semanal.</p>
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="http://localhost:3000/profesor/ramos" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver mis Ramos</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            Este es un correo automático generado por Scholar-Flow.
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(prof['email'], subject, html, f"Se te ha asignado la asignatura {sub.subject_name} para {course_name} ({sub.weekly_hours} horas semanales).")

        return created
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/course-subjects/{subject_id}")
async def update_course_subject(subject_id: str, sub: CourseSubjectUpdate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        subj_check = execute_query_one(
            """
            SELECT cs.id FROM course_subjects cs
            JOIN courses c ON cs.course_id = c.id
            WHERE cs.id = %s AND c.organization_id = %s
            """,
            (subject_id, organization_id)
        )
        if not subj_check:
            raise HTTPException(status_code=404, detail="Course subject mapping not found")

        # Get old mapping to compare professor
        old_mapping = execute_query_one(
            "SELECT professor_id, subject_name, weekly_hours, course_id FROM course_subjects WHERE id = %s",
            (subject_id,)
        )

        prof = None
        if sub.professor_id:
            prof = execute_query_one("SELECT * FROM professors WHERE id = %s AND organization_id = %s", (sub.professor_id, organization_id))
            if not prof:
                raise HTTPException(status_code=404, detail="Professor not found in this organization")

        update_fields = []
        params = []
        data = sub.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        for k, v in data.items():
            update_fields.append(f"{k} = %s")
            params.append(v)

        params.append(subject_id)
        query = f"UPDATE course_subjects SET {', '.join(update_fields)} WHERE id = %s RETURNING *;"
        updated = execute_query_one(query, params)
        if not updated:
             raise HTTPException(status_code=500, detail="Failed to update course subject mapping")
             
        updated['id'] = str(updated['id'])
        updated['course_id'] = str(updated['course_id'])
        updated['professor_id'] = str(updated['professor_id']) if updated.get('professor_id') else None

        if sub.professor_id and prof and prof.get('email') and (not old_mapping or str(old_mapping.get('professor_id')) != str(sub.professor_id)):
            course_detail = execute_query_one("SELECT name FROM courses WHERE id = %s", (old_mapping['course_id'] if old_mapping else updated['course_id'],))
            course_name = course_detail['name'] if course_detail else "Curso Desconocido"
            subject = "Asignación de Carga Horaria"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #0d9488, #0f766e); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Nueva Asignación de Asignatura</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{prof['full_name']}</strong>,</p>
                            <p>Se te ha asignado una nueva asignatura en la plataforma:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Curso:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{course_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Asignatura:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{updated['subject_name']}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Horas Semanales:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{updated['weekly_hours']} horas</td>
                                </tr>
                            </table>
                            <p style="font-size: 13px; color: #64748b;">Puedes ingresar a tu Portal Docente para ver los detalles de tu horario semanal.</p>
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="http://localhost:3000/profesor/ramos" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver mis Ramos</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            Este es un correo automático generado por Scholar-Flow.
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(prof['email'], subject, html, f"Se te ha asignado la asignatura {updated['subject_name']} para {course_name} ({updated['weekly_hours']} horas semanales).")

        return updated
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/course-subjects/{subject_id}")
async def delete_course_subject(subject_id: str, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        subj_check = execute_query_one(
            """
            SELECT cs.id FROM course_subjects cs
            JOIN courses c ON cs.course_id = c.id
            WHERE cs.id = %s AND c.organization_id = %s
            """,
            (subject_id, organization_id)
        )
        if not subj_check:
             raise HTTPException(status_code=404, detail="Course subject mapping not found")

        deleted = execute_query_one("DELETE FROM course_subjects WHERE id = %s RETURNING id", (subject_id,))
        return {"status": "success", "id": str(deleted['id'])}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# --- SCHEDULE SLOTS CRUD ---

@app.get("/schedule-slots")
async def get_schedule_slots(
    course_id: Optional[str] = None,
    professor_id: Optional[str] = None,
    organization_id: str = Depends(get_organization_id_from_host)
):
    try:
        query = """
            SELECT 
                ss.id,
                ss.course_id,
                ss.course_subject_id,
                ss.day_of_week,
                ss.period_number,
                c.name as course_name,
                cs.subject_name,
                cs.weekly_hours,
                p.id as professor_id,
                p.full_name as professor_name
            FROM schedule_slots ss
            JOIN courses c ON ss.course_id = c.id
            JOIN course_subjects cs ON ss.course_subject_id = cs.id
            LEFT JOIN professors p ON cs.professor_id = p.id
            WHERE ss.organization_id = %s
        """
        params = [organization_id]

        if course_id:
            query += " AND ss.course_id = %s"
            params.append(course_id)
        if professor_id:
            query += " AND cs.professor_id = %s"
            params.append(professor_id)

        query += " ORDER BY ss.day_of_week ASC, ss.period_number ASC"
        
        slots = execute_query(query, tuple(params), fetch=True)
        for s in slots:
            s['id'] = str(s['id'])
            s['course_id'] = str(s['course_id'])
            s['course_subject_id'] = str(s['course_subject_id'])
            if s.get('professor_id'):
                s['professor_id'] = str(s['professor_id'])
        return slots
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/schedule-slots")
async def create_schedule_slot(slot: ScheduleSlotCreate, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        course = execute_query_one("SELECT id FROM courses WHERE id = %s AND organization_id = %s", (slot.course_id, organization_id))
        if not course:
            raise HTTPException(status_code=404, detail="Course not found in this organization")

        subj = execute_query_one("SELECT id FROM course_subjects WHERE id = %s AND course_id = %s", (slot.course_subject_id, slot.course_id))
        if not subj:
            raise HTTPException(status_code=404, detail="Course subject mapping not found for this course")

        # Delete any existing slot in this day/period for this course
        execute_query(
            "DELETE FROM schedule_slots WHERE course_id = %s AND day_of_week = %s AND period_number = %s",
            (slot.course_id, slot.day_of_week, slot.period_number)
        )

        # Insert new slot
        query = """
            INSERT INTO schedule_slots (organization_id, course_id, course_subject_id, day_of_week, period_number)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
        """
        params = (organization_id, slot.course_id, slot.course_subject_id, slot.day_of_week, slot.period_number)
        created = execute_query_one(query, params)
        if not created:
            raise HTTPException(status_code=500, detail="Failed to schedule slot")

        created['id'] = str(created['id'])
        created['course_id'] = str(created['course_id'])
        created['course_subject_id'] = str(created['course_subject_id'])
        return created
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/schedule-slots/{slot_id}")
async def delete_schedule_slot(slot_id: str, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        deleted = execute_query_one(
            "DELETE FROM schedule_slots WHERE id = %s AND organization_id = %s RETURNING id",
            (slot_id, organization_id)
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Schedule slot not found")
        return {"status": "success", "id": str(deleted['id'])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/schedule-slots/batch")
async def save_schedule_slots_batch(batch: ScheduleSlotBatch, organization_id: str = Depends(get_organization_id_from_host)):
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # 1. Verify course belongs to organization
                cur.execute("SELECT id FROM courses WHERE id = %s AND organization_id = %s", (batch.course_id, organization_id))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Course not found in this organization")

                # 2. Delete all existing slots for this course
                cur.execute("DELETE FROM schedule_slots WHERE course_id = %s", (batch.course_id,))

                # 3. Insert all new slots
                inserted = []
                for slot in batch.slots:
                    # Verify course subject exists
                    cur.execute("SELECT id FROM course_subjects WHERE id = %s AND course_id = %s", (slot.course_subject_id, batch.course_id))
                    if not cur.fetchone():
                        raise HTTPException(
                            status_code=400,
                            detail=f"Course subject mapping {slot.course_subject_id} not found for this course"
                        )

                    cur.execute(
                        """
                        INSERT INTO schedule_slots (organization_id, course_id, course_subject_id, day_of_week, period_number)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING *;
                        """,
                        (organization_id, batch.course_id, slot.course_subject_id, slot.day_of_week, slot.period_number)
                    )
                    row = cur.fetchone()
                    inserted.append(dict(row))
                    
                for r in inserted:
                    r['id'] = str(r['id'])
                    r['course_id'] = str(r['course_id'])
                    r['course_subject_id'] = str(r['course_subject_id'])
                return {"status": "success", "slots": inserted}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# --- SCHEDULE OPTIMIZER WITH GEMINI ---

@app.post("/schedule-slots/optimize")
async def optimize_schedule(req: OptimizeRequest, organization_id: str = Depends(get_organization_id_from_host)):
    import traceback
    try:
        # 1. Fetch courses
        if req.course_id:
            courses = execute_query(
                "SELECT * FROM courses WHERE id = %s AND organization_id = %s",
                (req.course_id, organization_id),
                fetch=True
            )
            if not courses:
                raise HTTPException(status_code=404, detail="Course not found")
        else:
            courses = execute_query(
                "SELECT * FROM courses WHERE organization_id = %s",
                (organization_id,),
                fetch=True
            )

        if not courses:
            raise HTTPException(status_code=400, detail="No courses found to optimize")

        # 2. Fetch course subjects (ramos)
        if req.course_id:
            subjects = execute_query(
                """
                SELECT cs.*, p.full_name as professor_name 
                FROM course_subjects cs
                LEFT JOIN professors p ON cs.professor_id = p.id
                WHERE cs.course_id = %s
                """,
                (req.course_id,),
                fetch=True
            )
        else:
            subjects = execute_query(
                """
                SELECT cs.*, p.full_name as professor_name 
                FROM course_subjects cs
                JOIN courses c ON cs.course_id = c.id
                LEFT JOIN professors p ON cs.professor_id = p.id
                WHERE c.organization_id = %s
                """,
                (organization_id,),
                fetch=True
            )

        # 3. Fetch professors for organization
        professors = execute_query(
            "SELECT * FROM professors WHERE organization_id = %s",
            (organization_id,),
            fetch=True
        )

        # 4. Fetch forbidden teacher slots (occupied in other courses)
        forbidden_slots = []
        if req.course_id:
            forbidden_query = """
                SELECT ss.day_of_week, ss.period_number, cs.professor_id, c.name as course_name
                FROM schedule_slots ss
                JOIN course_subjects cs ON ss.course_subject_id = cs.id
                JOIN courses c ON ss.course_id = c.id
                WHERE ss.course_id != %s AND ss.organization_id = %s AND cs.professor_id IS NOT NULL
            """
            forbidden = execute_query(forbidden_query, (req.course_id, organization_id), fetch=True)
            for f in forbidden:
                forbidden_slots.append({
                    "professor_id": str(f["professor_id"]),
                    "day_of_week": f["day_of_week"],
                    "period_number": f["period_number"],
                    "reason": f"Ocupado dictando clases en {f['course_name']}"
                })

        # 5. Format input data for Gemini
        courses_input = [{"id": str(c["id"]), "name": c["name"]} for c in courses]
        subjects_input = []
        for s in subjects:
            subjects_input.append({
                "id": str(s["id"]),
                "course_id": str(s["course_id"]),
                "subject_name": s["subject_name"],
                "weekly_hours": s["weekly_hours"],
                "professor_id": str(s["professor_id"]) if s.get("professor_id") else None,
                "professor_name": s.get("professor_name")
            })
        
        professors_input = []
        for p in professors:
            professors_input.append({
                "id": str(p["id"]),
                "full_name": p["full_name"],
                "subjects": p.get("subjects") or [],
                "contract_hours": p.get("contract_hours", 44)
            })

        constraints_payload = {
            "courses": courses_input,
            "subjects": subjects_input,
            "professors": professors_input,
            "forbidden_teacher_slots": forbidden_slots,
            "grid": {
                "days": [1, 2, 3, 4, 5],
                "periods": [1, 2, 3, 4, 5, 6, 7, 8]
            }
        }

        # 6. Generate optimized timetable using Gemini
        SYSTEM_OPTIMIZE_PROMPT = """
        Eres un motor de optimización de horarios escolares basado en Inteligencia Artificial.
        Tu tarea es generar un horario escolar libre de colisiones para los cursos y materias indicadas.

        Reglas estrictas de optimización:
        1. Para cada materia en 'subjects', debes programar exactamente 'weekly_hours' bloques en el horario semanal.
        2. Si una materia tiene 'professor_id' como null o no asignado, prográmala igual (sin profesor).
        3. Restricción de Profesor Único: Un mismo profesor (professor_id) NO puede dar clases en más de un curso en el mismo día (day_of_week) y bloque (period_number).
        4. Restricción de Bloque Único: Un curso (course_id) NO puede tener más de una materia en el mismo día y bloque.
        5. Evitar colisión de restricciones: No programes a un profesor en los bloques indicados en 'forbidden_teacher_slots'.
        6. Preferencia pedagógica: Intenta distribuir las horas de una misma asignatura a lo largo de la semana de forma uniforme (ej: si son 4 horas, repartir en 2 clases de 2 horas o 4 de 1 hora, evitar poner las 4 horas seguidas en el mismo día a menos que no haya otra opción).
        7. Evitar ventanas: Intenta agrupar las clases de los profesores consecutivamente para evitar que tengan horas libres intermedias en su jornada.

        Retorna EXCLUSIVAMENTE un objeto JSON con el siguiente esquema:
        {
          "slots": [
            {
              "course_id": "string (UUID del curso)",
              "course_subject_id": "string (UUID de la asignatura)",
              "day_of_week": int (1 a 5),
              "period_number": int (1 a 8)
            }
          ]
        }
        Cualquier otro formato de salida es inaceptable. No agregues explicaciones, marcas markdown, ni texto plano.
        """

        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_OPTIMIZE_PROMPT,
            generation_config=generation_config
        )

        prompt = f"Genera el horario optimizado para los siguientes requerimientos y restricciones:\n{json.dumps(constraints_payload, indent=2)}"
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Parse output
        try:
            result_json = json.loads(result_text)
            optimized_slots = result_json.get("slots", [])
        except Exception as parse_err:
            print(f"❌ Error parsing Gemini output: {parse_err}")
            print(f"Original Gemini Output:\n{result_text}")
            raise HTTPException(status_code=500, detail="Gemini generated invalid JSON format")

        # 7. Persist to database in a single transaction
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if req.course_id:
                    cur.execute("DELETE FROM schedule_slots WHERE course_id = %s", (req.course_id,))
                else:
                    cur.execute("DELETE FROM schedule_slots WHERE organization_id = %s", (organization_id,))

                # Insert optimized slots
                inserted = []
                for slot in optimized_slots:
                    cur.execute("SELECT id FROM courses WHERE id = %s AND organization_id = %s", (slot["course_id"], organization_id))
                    if not cur.fetchone():
                        continue

                    cur.execute(
                        """
                        INSERT INTO schedule_slots (organization_id, course_id, course_subject_id, day_of_week, period_number)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING *;
                        """,
                        (organization_id, slot["course_id"], slot["course_subject_id"], slot["day_of_week"], slot["period_number"])
                    )
                    row = cur.fetchone()
                    inserted.append(row)
                    
        return {"status": "success", "message": f"Horario optimizado con IA. Se programaron {len(inserted)} bloques."}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Error in optimize_schedule: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
#  AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode JWT and return its payload; raise 401 if invalid."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


@app.post("/auth/register", response_model=TokenResponse, tags=["auth"])
async def register_organization(body: OrganizationRegister):
    """
    Create a new organization (tenant) and its first admin user.
    Returns a JWT token on success.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=__import__('psycopg2').extras.RealDictCursor) as cur:
                # 1. Check subdomain uniqueness
                cur.execute("SELECT id FROM organizations WHERE subdomain = %s", (body.subdomain,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail=f"El subdominio '{body.subdomain}' ya está en uso.")

                # 2. Check email uniqueness
                cur.execute("SELECT id FROM users WHERE email = %s", (body.admin_email.lower(),))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Este correo ya está registrado.")

                # 3. Create organization
                cur.execute(
                    """
                    INSERT INTO organizations (name, subdomain)
                    VALUES (%s, %s)
                    RETURNING id, name, subdomain, subscription_status, trial_ends_at, subscription_ends_at, logo_url, primary_color, secondary_color
                    """,
                    (body.org_name.strip(), body.subdomain)
                )
                org = dict(cur.fetchone())

                # 4. Create admin user
                pw_hash = get_password_hash(body.admin_password)
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, full_name, role, organization_id)
                    VALUES (%s, %s, %s, 'admin', %s)
                    RETURNING id, email, full_name, role
                    """,
                    (body.admin_email.lower().strip(), pw_hash, body.admin_full_name.strip(), org["id"])
                )
                user = dict(cur.fetchone())

        # 5. Issue JWT
        token_data = {
            "sub": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "org_id": str(org["id"]),
            "org_name": org["name"],
            "subdomain": org["subdomain"],
        }
        access_token = create_access_token(token_data)

        return TokenResponse(
            access_token=access_token,
            user=UserInfo(
                id=str(user["id"]),
                email=user["email"],
                full_name=user["full_name"],
                role=user["role"],
                organization=OrgInfo(
                    id=str(org["id"]),
                    name=org["name"],
                    subdomain=org["subdomain"],
                    subscription_status=org["subscription_status"],
                    trial_ends_at=org["trial_ends_at"],
                    subscription_ends_at=org["subscription_ends_at"],
                    logo_url=org.get("logo_url"),
                    primary_color=org.get("primary_color"),
                    secondary_color=org.get("secondary_color")
                )
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login", response_model=TokenResponse, tags=["auth"])
async def login(body: UserLogin):
    """
    Authenticate user by email + password.
    Returns a JWT token and user info.
    """
    try:
        row = execute_query_one(
            """
            SELECT u.id, u.email, u.full_name, u.role, u.password_hash, u.professor_id,
                   o.id AS org_id, o.name AS org_name, o.subdomain,
                   o.subscription_status, o.trial_ends_at, o.subscription_ends_at,
                   o.logo_url, o.primary_color, o.secondary_color
            FROM users u
            JOIN organizations o ON o.id = u.organization_id
            WHERE u.email = %s
            """,
            (body.email.lower().strip(),)
        )

        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Credenciales inválidas.")

        token_data = {
            "sub": str(row["id"]),
            "email": row["email"],
            "role": row["role"],
            "org_id": str(row["org_id"]),
            "org_name": row["org_name"],
            "subdomain": row["subdomain"],
        }
        if row.get("professor_id"):
            token_data["professor_id"] = str(row["professor_id"])
        
        access_token = create_access_token(token_data)

        return TokenResponse(
            access_token=access_token,
            user=UserInfo(
                id=str(row["id"]),
                email=row["email"],
                full_name=row["full_name"],
                role=row["role"],
                organization=OrgInfo(
                    id=str(row["org_id"]),
                    name=row["org_name"],
                    subdomain=row["subdomain"],
                    subscription_status=row["subscription_status"],
                    trial_ends_at=row["trial_ends_at"],
                    subscription_ends_at=row["subscription_ends_at"],
                    logo_url=row.get("logo_url"),
                    primary_color=row.get("primary_color"),
                    secondary_color=row.get("secondary_color")
                )
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/forgot-password", tags=["auth"])
async def forgot_password(body: ForgotPasswordRequest):
    """
    Generate password reset token and send reset email.
    """
    import secrets
    from datetime import datetime, timedelta

    email_clean = body.email.lower().strip()
    try:
        user = execute_query_one(
            "SELECT id, email, full_name FROM users WHERE email = %s",
            (email_clean,)
        )

        if user:
            token = secrets.token_hex(20)
            expires = datetime.now() + timedelta(hours=1)

            execute_query(
                """
                UPDATE users
                SET reset_token = %s,
                    reset_token_expires = %s
                WHERE id = %s
                """,
                (token, expires, user["id"]),
                fetch=False
            )

            reset_link = f"http://localhost:3000/reset-password?token={token}"
            subject = "Recuperación de Contraseña — Scholar-Flow"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #6366f1, #4f46e5); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Restablecer Contraseña</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{user['full_name'] or user['email']}</strong>,</p>
                            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Scholar-Flow.</p>
                            <p>Para establecer una nueva contraseña, haz clic en el siguiente enlace (expira en 1 hora):</p>
                            
                            <div style="margin: 24px 0; text-align: center;">
                                <a href="{reset_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                            </div>
                            
                            <p style="font-size: 12px; color: #64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                            <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">{reset_link}</p>
                            
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                            <p style="font-size: 12px; color: #94a3b8;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña seguirá siendo la misma.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(user["email"], subject, html, f"Haz clic en el siguiente enlace para restablecer tu contraseña: {reset_link}")

        return {"status": "ok", "message": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/reset-password", tags=["auth"])
async def reset_password(body: ResetPasswordRequest):
    """
    Verify reset token and set new password.
    """
    from datetime import datetime, timezone

    try:
        user = execute_query_one(
            """
            SELECT id, reset_token_expires
            FROM users
            WHERE reset_token = %s
            """,
            (body.token,)
        )

        if not user:
            raise HTTPException(
                status_code=400,
                detail="Token de restablecimiento inválido o ya utilizado."
            )

        expires = user["reset_token_expires"]
        now = datetime.now(timezone.utc) if expires.tzinfo else datetime.now()
        if expires < now:
            raise HTTPException(
                status_code=400,
                detail="El enlace de restablecimiento ha expirado."
            )

        new_hash = get_password_hash(body.new_password)
        execute_query(
            """
            UPDATE users
            SET password_hash = %s,
                reset_token = NULL,
                reset_token_expires = NULL
            WHERE id = %s
            """,
            (new_hash, user["id"]),
            fetch=False
        )

        return {"status": "ok", "message": "Contraseña restablecida correctamente."}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/me", response_model=UserInfo, tags=["auth"])
async def get_me(payload: dict = Depends(get_current_user_payload)):
    """
    Returns authenticated user profile from JWT token.
    """
    return UserInfo(
        id=payload["sub"],
        email=payload["email"],
        full_name=payload.get("full_name"),
        role=payload["role"],
        organization=OrgInfo(
            id=payload["org_id"],
            name=payload["org_name"],
            subdomain=payload["subdomain"]
        )
    )


@app.get("/auth/check-subdomain", tags=["auth"])
async def check_subdomain(subdomain: str):
    """
    Check if a subdomain is available.
    Returns {"available": bool}
    """
    import re
    slug = re.sub(r'[^a-z0-9-]', '-', subdomain.lower().strip())
    slug = re.sub(r'-+', '-', slug).strip('-')
    existing = execute_query_one("SELECT id FROM organizations WHERE subdomain = %s", (slug,))
    return {"available": existing is None, "subdomain": slug}


# ═══════════════════════════════════════════════════════════
#  PROFESSOR PORTAL ENDPOINTS
# ═══════════════════════════════════════════════════════════

def require_admin(payload: dict = Depends(get_current_user_payload)) -> dict:
    """Dependency: ensures only admins can call the endpoint."""
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden realizar esta acción.")
    return payload

def require_professor(payload: dict = Depends(get_current_user_payload)) -> dict:
    """Dependency: ensures the caller is a member (professor) with a professor_id."""
    if payload.get("role") != "member" or not payload.get("professor_id"):
        raise HTTPException(status_code=403, detail="Acceso restringido al portal docente.")
    return payload


@app.post("/auth/invite-professor", tags=["auth", "professor"])
async def invite_professor(
    body: ProfessorInvite,
    admin: dict = Depends(require_admin)
):
    """
    Admin creates a portal account (user) linked to an existing professor record.
    """
    import psycopg2.extras as extras
    org_id = admin["org_id"]

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                # 1. Verify professor belongs to this organization
                cur.execute(
                    "SELECT id, full_name, email FROM professors WHERE id = %s AND organization_id = %s",
                    (body.professor_id, org_id)
                )
                prof = cur.fetchone()
                if not prof:
                    raise HTTPException(status_code=404, detail="Profesor no encontrado en esta organización.")

                # 2. Check professor doesn't already have an account
                cur.execute("SELECT id FROM users WHERE professor_id = %s", (body.professor_id,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Este profesor ya tiene una cuenta en el portal.")

                # 3. Check email not taken
                email = body.email.lower().strip()
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Este correo ya está registrado.")

                # 4. Create user account
                pw_hash = get_password_hash(body.password)
                display_name = body.full_name or prof["full_name"]
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, full_name, role, organization_id, professor_id)
                    VALUES (%s, %s, %s, 'member', %s, %s)
                    RETURNING id
                    """,
                    (email, pw_hash, display_name, org_id, body.professor_id)
                )
                user_id = cur.fetchone()["id"]

                # 5. Update professors.email if not set
                cur.execute(
                    "UPDATE professors SET email = COALESCE(email, %s) WHERE id = %s",
                    (email, body.professor_id)
                )

        return {"status": "ok", "user_id": str(user_id), "email": email}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/professor/me", response_model=ProfessorProfile, tags=["professor"])
async def get_professor_me(payload: dict = Depends(require_professor)):
    """Returns the full profile of the authenticated professor."""
    professor_id = payload["professor_id"]
    org_id       = payload["org_id"]

    row = execute_query_one(
        """
        SELECT p.id, p.full_name, p.rut, p.subjects, p.contract_type,
               p.contract_hours, p.assigned_hours, p.is_available,
               COALESCE(p.email, u.email) AS email,
               p.phone, p.bio,
               u.id AS user_id,
               o.id AS org_id, o.name AS org_name, o.subdomain
        FROM professors p
        JOIN users u ON u.professor_id = p.id
        JOIN organizations o ON o.id = p.organization_id
        WHERE p.id = %s AND p.organization_id = %s
        """,
        (professor_id, org_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Perfil no encontrado.")

    return ProfessorProfile(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        full_name=row["full_name"],
        email=row["email"],
        phone=row.get("phone"),
        bio=row.get("bio"),
        rut=row["rut"],
        subjects=row.get("subjects") or [],
        contract_type=row["contract_type"],
        contract_hours=row["contract_hours"],
        assigned_hours=row["assigned_hours"],
        is_available=row["is_available"],
        organization=OrgInfo(
            id=str(row["org_id"]),
            name=row["org_name"],
            subdomain=row["subdomain"]
        )
    )


@app.patch("/professor/me", tags=["professor"])
async def update_professor_me(
    body: ProfessorProfileUpdate,
    payload: dict = Depends(require_professor)
):
    """Professor updates their own profile (name, email, phone, bio)."""
    professor_id = payload["professor_id"]
    org_id       = payload["org_id"]
    user_id      = payload["sub"]

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update professors table
                if body.full_name is not None:
                    cur.execute("UPDATE professors SET full_name = %s WHERE id = %s AND organization_id = %s",
                                (body.full_name, professor_id, org_id))
                if body.phone is not None:
                    cur.execute("UPDATE professors SET phone = %s WHERE id = %s", (body.phone, professor_id))
                if body.bio is not None:
                    cur.execute("UPDATE professors SET bio = %s WHERE id = %s", (body.bio, professor_id))
                if body.email is not None:
                    email = body.email.lower().strip()
                    # Verify not taken by another user
                    cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
                    if cur.fetchone():
                        raise HTTPException(status_code=409, detail="Ese correo ya está en uso.")
                    cur.execute("UPDATE professors SET email = %s WHERE id = %s", (email, professor_id))
                    cur.execute("UPDATE users SET email = %s, full_name = COALESCE(%s, full_name) WHERE id = %s",
                                (email, body.full_name, user_id))
                elif body.full_name is not None:
                    cur.execute("UPDATE users SET full_name = %s WHERE id = %s", (body.full_name, user_id))

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/professor/subjects", tags=["professor"])
async def get_professor_subjects(payload: dict = Depends(require_professor)):
    """Returns all course_subjects assigned to the authenticated professor."""
    professor_id = payload["professor_id"]
    org_id       = payload["org_id"]

    rows = execute_query(
        """
        SELECT cs.id, cs.subject_name, cs.weekly_hours,
               c.id AS course_id, c.name AS course_name
        FROM course_subjects cs
        JOIN courses c ON c.id = cs.course_id
        WHERE cs.professor_id = %s AND c.organization_id = %s
        ORDER BY c.name, cs.subject_name
        """,
        (professor_id, org_id),
        fetch=True
    )
    return rows or []


# ═══════════════════════════════════════════════════════════
#  LEAVE REQUEST ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.post("/leave-requests", tags=["leave-requests"])
async def create_leave_request(
    body: LeaveRequestCreate,
    payload: dict = Depends(require_professor)
):
    """Professor creates an admin-day / admin-hours / leave request."""
    import psycopg2.extras as extras
    professor_id = payload["professor_id"]
    org_id       = payload["org_id"]

    try:
        # Get professor name
        prof_info = execute_query_one(
            "SELECT full_name FROM professors WHERE id = %s",
            (professor_id,)
        )
        prof_name = prof_info["full_name"] if prof_info else "Docente"

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                # Prevent duplicate pending request for same date
                cur.execute(
                    """
                    SELECT id FROM leave_requests
                    WHERE professor_id = %s AND requested_date = %s AND status = 'pending'
                    """,
                    (professor_id, body.requested_date)
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="Ya tienes una solicitud pendiente para esa fecha."
                    )

                cur.execute(
                    """
                    INSERT INTO leave_requests
                        (professor_id, organization_id, request_type, requested_date,
                         start_time, end_time, reason)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, request_type, requested_date, status, created_at
                    """,
                    (
                        professor_id, org_id, body.request_type,
                        body.requested_date,
                        body.start_time, body.end_time,
                        body.reason
                    )
                )
                row = dict(cur.fetchone())

                # Get all admins in the organization
                cur.execute(
                    "SELECT id, email, full_name FROM users WHERE organization_id = %s AND role = 'admin'",
                    (org_id,)
                )
                admins = cur.fetchall()

                # Display values for request type
                display_type = {
                    "dia_admin": "Día Administrativo",
                    "horas_admin": "Horas Administrativas",
                    "permiso": "Permiso Especial"
                }.get(body.request_type, body.request_type)

                # Create notifications for admins
                for admin in admins:
                    cur.execute(
                        """
                        INSERT INTO notifications (user_id, organization_id, title, message)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            admin["id"],
                            org_id,
                            "Nueva Solicitud de Permiso",
                            f"El docente {prof_name} ha solicitado un(a) {display_type} para la fecha {body.requested_date}."
                        )
                    )

        # Send emails to admins
        for admin in admins:
            subject = f"Nueva Solicitud: {prof_name} ({display_type})"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #6366f1, #4f46e5); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Nueva Solicitud de Permiso Docente</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{admin['full_name']}</strong>,</p>
                            <p>El docente <strong>{prof_name}</strong> ha ingresado una nueva solicitud de permiso administrativo en la plataforma:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">Tipo de Permiso:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{display_type}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Fecha Solicitada:</td>
                                    <td style="padding: 8px 0; color: #1e293b;">{body.requested_date}</td>
                                </tr>
                                {f"<tr><td style='padding: 8px 0; font-weight: bold; color: #64748b;'>Horario:</td><td style='padding: 8px 0; color: #1e293b;'>{body.start_time} - {body.end_time}</td></tr>" if body.start_time and body.end_time else ""}
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; vertical-align: top;">Motivo / Razón:</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-style: italic;">"{body.reason or 'No especificado'}"</td>
                                </tr>
                            </table>
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="http://localhost:3000/dashboard/permisos" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Revisar Solicitud</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            Este es un correo automático generado por Scholar-Flow.
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(admin["email"], subject, html, f"El docente {prof_name} ha solicitado {display_type} para el {body.requested_date}.")

        return {
            "id": str(row["id"]),
            "request_type": row["request_type"],
            "requested_date": str(row["requested_date"]),
            "status": row["status"],
            "created_at": str(row["created_at"]),
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/leave-requests", tags=["leave-requests"])
async def list_leave_requests(
    status: Optional[str] = None,
    professor_id_filter: Optional[str] = None,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Professor: sees only their own requests.
    Admin: sees all requests from their organization (optionally filtered).
    """
    role   = payload.get("role")
    org_id = payload["org_id"]

    conditions = ["lr.organization_id = %s"]
    params: list = [org_id]

    if role == "member":
        # Professor only sees their own
        conditions.append("lr.professor_id = %s")
        params.append(payload["professor_id"])
    elif professor_id_filter:
        conditions.append("lr.professor_id = %s")
        params.append(professor_id_filter)

    if status:
        conditions.append("lr.status = %s")
        params.append(status)

    where = " AND ".join(conditions)
    rows = execute_query(
        f"""
        SELECT lr.id, lr.request_type, lr.requested_date, lr.start_time, lr.end_time,
               lr.reason, lr.status, lr.admin_comment, lr.created_at, lr.reviewed_at,
               p.full_name AS professor_name, p.id AS professor_id,
               u.full_name AS reviewed_by_name
        FROM leave_requests lr
        JOIN professors p ON p.id = lr.professor_id
        LEFT JOIN users u ON u.id = lr.reviewed_by
        WHERE {where}
        ORDER BY lr.requested_date DESC, lr.created_at DESC
        """,
        tuple(params),
        fetch=True
    )

    # Serialize dates and times
    result = []
    for r in (rows or []):
        result.append({
            "id":               str(r["id"]),
            "request_type":     r["request_type"],
            "requested_date":   str(r["requested_date"]),
            "start_time":       str(r["start_time"]) if r.get("start_time") else None,
            "end_time":         str(r["end_time"])   if r.get("end_time")   else None,
            "reason":           r.get("reason"),
            "status":           r["status"],
            "admin_comment":    r.get("admin_comment"),
            "professor_name":   r["professor_name"],
            "professor_id":     str(r["professor_id"]),
            "reviewed_by_name": r.get("reviewed_by_name"),
            "reviewed_at":      str(r["reviewed_at"]) if r.get("reviewed_at") else None,
            "created_at":       str(r["created_at"]),
        })
    return result


@app.patch("/leave-requests/{request_id}/review", tags=["leave-requests"])
async def review_leave_request(
    request_id: str,
    body: LeaveRequestReview,
    admin: dict = Depends(require_admin)
):
    """Admin approves or rejects a leave request."""
    org_id   = admin["org_id"]
    admin_id = admin["sub"]

    try:
        # Get admin name
        admin_info = execute_query_one("SELECT full_name FROM users WHERE id = %s", (admin_id,))
        admin_name = admin_info["full_name"] if admin_info else "Administrador"

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update leave request
                cur.execute(
                    """
                    UPDATE leave_requests
                    SET status        = %s,
                        admin_comment = %s,
                        reviewed_by   = %s,
                        reviewed_at   = timezone('utc', now())
                    WHERE id = %s AND organization_id = %s AND status = 'pending'
                    RETURNING id, professor_id, request_type, requested_date
                    """,
                    (body.status, body.admin_comment, admin_id, request_id, org_id)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=404,
                        detail="Solicitud no encontrada o ya fue revisada."
                    )
                
                req_id, professor_id, request_type, requested_date = row

                # Find the user record associated with the professor to notify
                cur.execute(
                    "SELECT id, email, full_name FROM users WHERE professor_id = %s",
                    (professor_id,)
                )
                prof_user = cur.fetchone()
                
                display_type = {
                    "dia_admin": "Día Administrativo",
                    "horas_admin": "Horas Administrativas",
                    "permiso": "Permiso Especial"
                }.get(request_type, request_type)

                display_status = {
                    "approved": "APROBADA",
                    "rejected": "RECHAZADA"
                }.get(body.status, body.status)

                status_color = "#10b981" if body.status == "approved" else "#ef4444"

                if prof_user:
                    prof_user_id, prof_email, prof_full_name = prof_user
                    # Create in-app notification
                    cur.execute(
                        """
                        INSERT INTO notifications (user_id, organization_id, title, message)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            prof_user_id,
                            org_id,
                            f"Solicitud {display_status.lower()}",
                            f"Tu solicitud de {display_type} para el {requested_date} ha sido {display_status.lower()} por {admin_name}."
                        )
                    )

        # Send email to professor
        if prof_user and prof_email:
            subject = f"Solicitud de Permiso {display_status}"
            html = f"""
            <html>
                <body style="font-family: sans-serif; color: #334155; line-height: 1.5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(to right, #6366f1, #4f46e5); padding: 24px; color: white;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Scholar-Flow Portal</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">Actualización de Permiso Administrativo</p>
                        </div>
                        <div style="padding: 24px; background: white;">
                            <p>Hola <strong>{prof_full_name}</strong>,</p>
                            <p>Te informamos que tu solicitud de permiso ha sido revisada por el administrador:</p>
                            
                            <div style="background-color: #f8fafc; border-left: 4px solid {status_color}; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: {status_color};">Estado: {display_status}</p>
                                <p style="margin: 0; font-size: 14px;"><strong>Tipo:</strong> {display_type}</p>
                                <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Fecha:</strong> {requested_date}</p>
                                {f'<p style="margin: 8px 0 0 0; font-size: 13px; color: #475569; font-style: italic;"><strong>Comentario del admin:</strong> "{body.admin_comment}"</p>' if body.admin_comment else ""}
                            </div>
                            
                            <p style="font-size: 13px; color: #64748b;">Puedes ingresar al Portal Docente para ver los detalles de tu calendario de ausencias.</p>
                            
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="http://localhost:3000/profesor/permisos" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver mi Calendario</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            Este es un correo automático generado por Scholar-Flow.
                        </div>
                    </div>
                </body>
            </html>
            """
            send_email(prof_email, subject, html, f"Tu solicitud de {display_type} para el {requested_date} ha sido {display_status.lower()}.")

        return {"status": "ok", "new_status": body.status}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/leave-requests/stats", tags=["leave-requests"])
async def leave_request_stats(
    professor_id_filter: Optional[str] = None,
    payload: dict = Depends(get_current_user_payload)
):
    """Returns approved/pending/rejected counts + approved days count."""
    org_id = payload["org_id"]
    role   = payload.get("role")

    pid = payload.get("professor_id") if role == "member" else professor_id_filter

    cond   = "organization_id = %s"
    params: list = [org_id]
    if pid:
        cond += " AND professor_id = %s"
        params.append(pid)

    rows = execute_query(
        f"""
        SELECT status, COUNT(*) AS cnt,
               SUM(CASE WHEN request_type = 'dia_admin' THEN 1 ELSE 0 END) AS dias_admin,
               SUM(CASE WHEN request_type = 'horas_admin' THEN 1 ELSE 0 END) AS horas_admin_count
        FROM leave_requests
        WHERE {cond}
        GROUP BY status
        """,
        tuple(params),
        fetch=True
    )

    stats = {"pending": 0, "approved": 0, "rejected": 0,
             "approved_dias": 0, "approved_horas": 0}
    for r in (rows or []):
        s = r["status"]
        stats[s] = int(r["cnt"])
        if s == "approved":
            stats["approved_dias"]  = int(r["dias_admin"] or 0)
            stats["approved_horas"] = int(r["horas_admin_count"] or 0)

    return stats


# ═══════════════════════════════════════════════════════════
#  NOTIFICATIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.get("/notifications", tags=["notifications"])
async def list_notifications(
    payload: dict = Depends(get_current_user_payload)
):
    """Returns latest 50 notifications for the current user."""
    user_id = payload["sub"]
    org_id  = payload["org_id"]

    rows = execute_query(
        """
        SELECT id, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = %s AND organization_id = %s
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (user_id, org_id),
        fetch=True
    )

    result = []
    for r in (rows or []):
        result.append({
            "id":         str(r["id"]),
            "title":      r["title"],
            "message":    r["message"],
            "is_read":    r["is_read"],
            "created_at": str(r["created_at"])
        })
    return result


@app.patch("/notifications/read-all", tags=["notifications"])
async def mark_all_notifications_as_read(
    payload: dict = Depends(get_current_user_payload)
):
    """Marks all notifications of the current user as read."""
    user_id = payload["sub"]
    org_id  = payload["org_id"]

    try:
        execute_query(
            """
            UPDATE notifications
            SET is_read = true
            WHERE user_id = %s AND organization_id = %s
            """,
            (user_id, org_id),
            fetch=False
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/notifications/{notification_id}/read", tags=["notifications"])
async def mark_notification_as_read(
    notification_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    """Marks a single notification as read."""
    user_id = payload["sub"]
    org_id  = payload["org_id"]

    try:
        execute_query(
            """
            UPDATE notifications
            SET is_read = true
            WHERE id = %s AND user_id = %s AND organization_id = %s
            """,
            (notification_id, user_id, org_id),
            fetch=False
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agenda", response_model=AgendaItemResponse, tags=["agenda"])
async def create_agenda_item(
    body: AgendaItemCreate,
    professor: dict = Depends(require_professor)
):
    """Create a new agenda item for the current professor."""
    prof_id = professor["professor_id"]
    org_id = professor["org_id"]

    try:
        row = execute_query_one(
            """
            INSERT INTO professor_agenda (professor_id, organization_id, title, content, category, date, start_time, priority)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, title, content, category, date, start_time, priority, is_completed, created_at
            """,
            (prof_id, org_id, body.title, body.content, body.category, body.date, body.start_time, body.priority)
        )
        if not row:
            raise HTTPException(status_code=500, detail="Error al crear el registro de agenda.")
        
        start_time_str = row["start_time"].strftime("%H:%M") if row["start_time"] else None
        return AgendaItemResponse(
            id=str(row["id"]),
            title=row["title"],
            content=row["content"],
            category=row["category"],
            date=row["date"],
            start_time=start_time_str,
            priority=row["priority"],
            is_completed=row["is_completed"],
            created_at=row["created_at"]
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agenda", response_model=List[AgendaItemResponse], tags=["agenda"])
async def get_agenda_items(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    is_completed: Optional[bool] = None,
    professor: dict = Depends(require_professor)
):
    """Retrieve all agenda items for the current professor with optional filters."""
    prof_id = professor["professor_id"]

    query = """
        SELECT id, title, content, category, date, start_time, priority, is_completed, created_at
        FROM professor_agenda
        WHERE professor_id = %s
    """
    params = [prof_id]

    if category:
        query += " AND category = %s"
        params.append(category)
    if priority:
        query += " AND priority = %s"
        params.append(priority)
    if is_completed is not None:
        query += " AND is_completed = %s"
        params.append(is_completed)

    query += " ORDER BY date ASC, start_time ASC NULLS LAST, created_at ASC"

    try:
        rows = execute_query(query, tuple(params), fetch=True)
        results = []
        for row in (rows or []):
            start_time_str = row["start_time"].strftime("%H:%M") if row["start_time"] else None
            results.append(
                AgendaItemResponse(
                    id=str(row["id"]),
                    title=row["title"],
                    content=row["content"],
                    category=row["category"],
                    date=row["date"],
                    start_time=start_time_str,
                    priority=row["priority"],
                    is_completed=row["is_completed"],
                    created_at=row["created_at"]
                )
            )
        return results
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/agenda/{item_id}", response_model=AgendaItemResponse, tags=["agenda"])
async def update_agenda_item(
    item_id: str,
    body: AgendaItemUpdate,
    professor: dict = Depends(require_professor)
):
    """Update a specific agenda item."""
    prof_id = professor["professor_id"]

    try:
        existing = execute_query_one(
            "SELECT id FROM professor_agenda WHERE id = %s AND professor_id = %s",
            (item_id, prof_id)
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Item de agenda no encontrado.")

        update_fields = []
        params = []
        
        for field, value in body.model_dump(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            row = execute_query_one(
                "SELECT id, title, content, category, date, start_time, priority, is_completed, created_at FROM professor_agenda WHERE id = %s",
                (item_id,)
            )
            start_time_str = row["start_time"].strftime("%H:%M") if row["start_time"] else None
            return AgendaItemResponse(
                id=str(row["id"]),
                title=row["title"],
                content=row["content"],
                category=row["category"],
                date=row["date"],
                start_time=start_time_str,
                priority=row["priority"],
                is_completed=row["is_completed"],
                created_at=row["created_at"]
            )

        query = f"""
            UPDATE professor_agenda
            SET {", ".join(update_fields)}
            WHERE id = %s
            RETURNING id, title, content, category, date, start_time, priority, is_completed, created_at
        """
        params.append(item_id)
        
        row = execute_query_one(query, tuple(params))
        if not row:
            raise HTTPException(status_code=500, detail="Error al actualizar el registro de agenda.")

        start_time_str = row["start_time"].strftime("%H:%M") if row["start_time"] else None
        return AgendaItemResponse(
            id=str(row["id"]),
            title=row["title"],
            content=row["content"],
            category=row["category"],
            date=row["date"],
            start_time=start_time_str,
            priority=row["priority"],
            is_completed=row["is_completed"],
            created_at=row["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/agenda/{item_id}", tags=["agenda"])
async def delete_agenda_item(
    item_id: str,
    professor: dict = Depends(require_professor)
):
    """Delete a specific agenda item."""
    prof_id = professor["professor_id"]

    try:
        existing = execute_query_one(
            "SELECT id FROM professor_agenda WHERE id = %s AND professor_id = %s",
            (item_id, prof_id)
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Item de agenda no encontrado o acceso denegado.")

        execute_query(
            "DELETE FROM professor_agenda WHERE id = %s",
            (item_id,),
            fetch=False
        )
        return {"status": "ok", "message": "Item de agenda eliminado correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def time_to_minutes(t: str) -> int:
    h, m = map(int, t.split(":"))
    return h * 60 + m


def minutes_to_time(mins: int) -> str:
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"


def generate_timeline(cfg: dict) -> list:
    active_days = [d for d in cfg.get("days", []) if d.get("active")]
    if not active_days:
        return []

    global_start = min(time_to_minutes(d["start"]) for d in active_days)
    global_end = max(time_to_minutes(d["end"]) for d in active_days)

    sorted_breaks = sorted(
        cfg.get("breaks", []),
        key=lambda b: time_to_minutes(b["startTime"])
    )

    slots = []
    cur = global_start
    period_num = 1
    block_duration = cfg.get("blockDuration", 45)

    while cur < global_end:
        brk = next((b for b in sorted_breaks if time_to_minutes(b["startTime"]) == cur), None)
        if brk:
            slots.append({
                "type": "break",
                "id": brk["id"],
                "name": brk["name"],
                "start": minutes_to_time(cur),
                "end": minutes_to_time(cur + brk["duration"]),
                "breakType": brk["type"],
            })
            cur += brk["duration"]
            continue

        next_break = next((b for b in sorted_breaks if cur < time_to_minutes(b["startTime"]) < cur + block_duration), None)
        block_end = time_to_minutes(next_break["startTime"]) if next_break else min(cur + block_duration, global_end)

        if block_end - cur >= 15:
            slots.append({
                "type": "period",
                "num": period_num,
                "start": minutes_to_time(cur),
                "end": minutes_to_time(block_end),
            })
            period_num += 1
        cur = block_end

    return slots


def slot_status_for_day(slot: dict, day: dict) -> str:
    if not day.get("active"):
        return "inactive-day"
    if slot["type"] == "break":
        if time_to_minutes(slot["start"]) >= time_to_minutes(day["end"]):
            return "after-hours"
        return "break"
    if time_to_minutes(slot["start"]) >= time_to_minutes(day["end"]):
        return "after-hours"
    return "active"


@app.post("/schedule-slots/export/excel", tags=["schedule"])
async def export_schedule_excel(
    body: ExportScheduleRequest,
    organization_id: str = Depends(get_organization_id_from_host)
):
    """Generates and streams a formatted CSV (semicolon delimited with BOM) for Excel compatibility."""
    import csv
    from fastapi.responses import StreamingResponse

    try:
        course = execute_query_one(
            "SELECT name FROM courses WHERE id = %s AND organization_id = %s",
            (body.course_id, organization_id)
        )
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        course_name = course["name"]

        query = """
            SELECT 
                ss.day_of_week,
                ss.period_number,
                cs.subject_name,
                p.full_name as professor_name
            FROM schedule_slots ss
            JOIN course_subjects cs ON ss.course_subject_id = cs.id
            LEFT JOIN professors p ON cs.professor_id = p.id
            WHERE ss.course_id = %s AND ss.organization_id = %s
        """
        db_slots = execute_query(query, (body.course_id, organization_id), fetch=True) or []
        
        slots_map = {}
        for s in db_slots:
            prof = f" ({s['professor_name']})" if s['professor_name'] else ""
            slots_map[(s["day_of_week"], s["period_number"])] = f"{s['subject_name']}{prof}"

        cfg = body.schedule_config
        timeline = generate_timeline(cfg)
        active_days = [d for d in cfg.get("days", []) if d.get("active")]

        output = io.StringIO()
        output.write('\ufeff')
        
        writer = csv.writer(output, delimiter=';')
        
        writer.writerow([f"HORARIO SEMANAL: {course_name}"])
        writer.writerow([])
        
        headers = ["Bloque / Hora"] + [d["name"] for d in active_days]
        writer.writerow(headers)

        for slot in timeline:
            row = []
            if slot["type"] == "period":
                row.append(f"Bloque {slot['num']} ({slot['start']} - {slot['end']})")
            else:
                row.append(f"{slot['name']} ({slot['start']} - {slot['end']})")

            for day in active_days:
                status = slot_status_for_day(slot, day)
                if status == "inactive-day" or status == "after-hours":
                    row.append("—")
                elif status == "break":
                    row.append(slot["name"])
                else:
                    assigned = slots_map.get((day["id"], slot["num"]))
                    row.append(assigned if assigned else "Libre")
            writer.writerow(row)

        csv_data = output.getvalue()
        output.close()

        return StreamingResponse(
            io.BytesIO(csv_data.encode('utf-8-sig')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=horario_{course_name.replace(' ', '_')}.csv"
            }
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule-slots/export/pdf", tags=["schedule"])
async def export_schedule_pdf(
    body: ExportScheduleRequest,
    organization_id: str = Depends(get_organization_id_from_host)
):
    """Generates and streams a premium PDF document using ReportLab in landscape orientation."""
    from fastapi.responses import StreamingResponse
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, landscape

    try:
        course = execute_query_one(
            "SELECT name FROM courses WHERE id = %s AND organization_id = %s",
            (body.course_id, organization_id)
        )
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        course_name = course["name"]

        org = execute_query_one(
            "SELECT name FROM organizations WHERE id = %s",
            (organization_id,)
        )
        org_name = org["name"] if org else "Scholar-Flow"

        query = """
            SELECT 
                ss.day_of_week,
                ss.period_number,
                cs.subject_name,
                p.full_name as professor_name
            FROM schedule_slots ss
            JOIN course_subjects cs ON ss.course_subject_id = cs.id
            LEFT JOIN professors p ON cs.professor_id = p.id
            WHERE ss.course_id = %s AND ss.organization_id = %s
        """
        db_slots = execute_query(query, (body.course_id, organization_id), fetch=True) or []
        
        slots_map = {}
        for s in db_slots:
            slots_map[(s["day_of_week"], s["period_number"])] = {
                "subject": s["subject_name"],
                "professor": s["professor_name"] or "Sin docente"
            }

        cfg = body.schedule_config
        timeline = generate_timeline(cfg)
        active_days = [d for d in cfg.get("days", []) if d.get("active")]

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
        )

        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'PdfTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0f172a'),
            alignment=0
        )
        
        subtitle_style = ParagraphStyle(
            'PdfSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#64748b'),
            alignment=0
        )

        header_cell_style = ParagraphStyle(
            'HeaderCell',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.white,
            alignment=1
        )

        cell_title_style = ParagraphStyle(
            'CellTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1e293b'),
            alignment=1
        )

        cell_subtitle_style = ParagraphStyle(
            'CellSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7,
            leading=9,
            textColor=colors.HexColor('#64748b'),
            alignment=1
        )

        cell_block_style = ParagraphStyle(
            'CellBlock',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#1e293b'),
            alignment=1
        )

        cell_break_style = ParagraphStyle(
            'CellBreak',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#b45309'),
            alignment=1
        )

        cell_lunch_style = ParagraphStyle(
            'CellLunch',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#047857'),
            alignment=1
        )

        story = []

        story.append(Paragraph(f"HORARIO SEMANAL — {course_name.upper()}", title_style))
        story.append(Paragraph(f"Institución: {org_name} | Generado automáticamente por Scholar-Flow", subtitle_style))
        story.append(Spacer(1, 15))

        table_data = []
        header_row = []
        header_row.append(Paragraph("<b>Bloque / Hora</b>", header_cell_style))
        for d in active_days:
            header_row.append(Paragraph(f"<b>{d['name']}</b><br/><font size=7 color='#bfdbfe'>{d['start']} - {d['end']}</font>", header_cell_style))
        table_data.append(header_row)

        table_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]

        row_idx = 1
        for slot in timeline:
            row = []
            
            if slot["type"] == "period":
                label = f"<b>Bloque {slot['num']}</b><br/><font color='#64748b' size=7>{slot['start']} - {slot['end']}</font>"
                row.append(Paragraph(label, cell_block_style))
            else:
                label = f"<b>{slot['name']}</b><br/><font color='#64748b' size=7>{slot['start']} - {slot['end']}</font>"
                row.append(Paragraph(label, cell_block_style))

            col_idx = 1
            for day in active_days:
                status = slot_status_for_day(slot, day)
                
                if status == "inactive-day" or status == "after-hours":
                    row.append(Paragraph("<font color='#cbd5e1'>—</font>", cell_subtitle_style))
                elif status == "break":
                    if slot.get("breakType") == "almuerzo":
                        row.append(Paragraph(slot["name"], cell_lunch_style))
                        table_styles.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#d1fae5')))
                    else:
                        row.append(Paragraph(slot["name"], cell_break_style))
                        table_styles.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#fef3c7')))
                else:
                    assigned = slots_map.get((day["id"], slot["num"]))
                    if assigned:
                        cell_content = f"<b>{assigned['subject']}</b><br/><font size=7 color='#475569'>{assigned['professor']}</font>"
                        row.append(Paragraph(cell_content, cell_title_style))
                        table_styles.append(('BACKGROUND', (col_idx, row_idx), (col_idx, row_idx), colors.HexColor('#eff6ff')))
                    else:
                        row.append(Paragraph("<font color='#94a3b8'>Libre</font>", cell_subtitle_style))

                col_idx += 1
            
            table_data.append(row)
            row_idx += 1

        num_days = len(active_days)
        col_widths = [100] + [632 / num_days] * num_days

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle(table_styles))
        story.append(t)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()

        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=horario_{course_name.replace(' ', '_')}.pdf"
            }
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Billing (SaaS Flow) Endpoints ──────────────────────────────────────────

@app.get("/billing/status", response_model=BillingStatusResponse, tags=["billing"])
async def get_billing_status(payload: dict = Depends(get_current_user_payload)):
    """
    Returns the organization's billing status, subscription dates, seat counts and calculated total cost.
    """
    from datetime import datetime, timezone
    org_id = payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
        
    try:
        # 1. Fetch organization details
        org = execute_query_one(
            """
            SELECT subscription_status, trial_ends_at, subscription_ends_at, price_per_user
            FROM organizations
            WHERE id = %s
            """,
            (org_id,)
        )
        if not org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")

        # 2. Count active users
        user_count_row = execute_query_one(
            "SELECT COUNT(*)::integer as total FROM users WHERE organization_id = %s",
            (org_id,)
        )
        active_users = user_count_row["total"] if user_count_row else 0

        # 3. Calculate trial days left
        trial_days_left = None
        if org["trial_ends_at"]:
            now = datetime.now(timezone.utc)
            trial_end = org["trial_ends_at"]
            diff = trial_end - now
            trial_days_left = max(0, int(diff.days))

        price_per_user = org["price_per_user"]
        if org["subscription_status"] in ("free", "lifetime"):
            price_per_user = 0
        total_monthly_amount = active_users * price_per_user

        return BillingStatusResponse(
            subscription_status=org["subscription_status"],
            trial_ends_at=org["trial_ends_at"],
            trial_days_left=trial_days_left,
            subscription_ends_at=org["subscription_ends_at"],
            active_users=active_users,
            price_per_user=price_per_user,
            total_monthly_amount=total_monthly_amount
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/billing/pay", response_model=PaySubscriptionResponse, tags=["billing"])
async def pay_subscription(body: PaySubscriptionRequest, payload: dict = Depends(get_current_user_payload)):
    """
    Creates a pending payment order in Flow and returns the payment redirection URL.
    """
    org_id = payload.get("org_id")
    user_email = payload.get("email")
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")

    try:
        # 1. Get user count and price
        user_count_row = execute_query_one(
            "SELECT COUNT(*)::integer as total FROM users WHERE organization_id = %s",
            (org_id,)
        )
        active_users = user_count_row["total"] if user_count_row else 0
        
        org = execute_query_one(
            "SELECT name, price_per_user FROM organizations WHERE id = %s",
            (org_id,)
        )
        if not org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")

        price_per_user = org["price_per_user"]
        amount = active_users * price_per_user
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="El monto a pagar debe ser mayor a 0 (debes tener al menos 1 usuario)")

        # 2. Generate unique commerce order ID
        import time
        timestamp = int(time.time())
        commerce_order = f"SF-{str(org_id)[:8]}-{timestamp}"

        # 3. Create payment in Mercado Pago
        from mercado_pago_service import MercadoPagoService
        mp = MercadoPagoService()
        
        subject = f"Membresía Scholar-Flow - {active_users} usuarios"
        payment_data = {
            "commerceOrder": commerce_order,
            "subject": subject,
            "amount": amount,
            "email": user_email,
            "urlReturn": body.url_return
        }
        
        res = mp.create_payment(payment_data)
        if not res.get("success"):
            return PaySubscriptionResponse(
                success=False,
                error=res.get("error", "Error al crear pago en Mercado Pago"),
                amount=amount
            )

        # 4. Record payment in the database as 'pending'
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO payments (organization_id, flow_order, flow_token, plan, amount, status)
                    VALUES (%s, %s, %s, %s, %s, 'pending')
                    """,
                    (org_id, commerce_order, res.get("token"), "monthly", amount)
                )

        return PaySubscriptionResponse(
            success=True,
            payment_url=res.get("url"),
            amount=amount
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/billing/webhook", tags=["billing"])
async def billing_webhook(request: Request):
    """
    Asynchronous confirmation callback from Mercado Pago.
    """
    try:
        # Check URL query params first
        query_params = dict(request.query_params)
        
        # Parse JSON body if present
        body = {}
        try:
            body = await request.json()
        except Exception:
            pass

        topic = (
            query_params.get("topic") or 
            query_params.get("type") or 
            body.get("type")
        )
        
        # Accept resource ID
        data_obj = body.get("data") or {}
        data_id = (
            query_params.get("data.id") or 
            data_obj.get("id") or 
            query_params.get("id") or 
            body.get("id")
        )

        if not data_id or not topic:
            print(f"[Webhook] Notificación incompleta de Mercado Pago: topic={topic}, id={data_id}")
            return {"status": "ok"}

        if topic not in ("payment", "payment_notification"):
            print(f"[Webhook] Ignorando notificación de tipo no-pago: topic={topic}")
            return {"status": "ok"}

        print(f"[Webhook] Recibida notificación de Mercado Pago de pago ID: {data_id}")

        # 1. Fetch payment status from Mercado Pago
        from mercado_pago_service import MercadoPagoService
        mp = MercadoPagoService()
        status_res = mp.get_payment_status(str(data_id))
        if not status_res.get("success"):
            print(f"[Webhook] Error consultando estado en Mercado Pago: {status_res.get('error')}")
            raise HTTPException(status_code=400, detail="No se pudo consultar estado en Mercado Pago")

        mp_data = status_res["data"]
        commerce_order = mp_data.get("commerceOrder")
        status = mp_data.get("status") # 2 = Pagado

        print(f"[Webhook] Orden: {commerce_order}, Estado en Mercado Pago: {status}")

        # 2. Find matching payment in DB
        payment = execute_query_one(
            "SELECT id, organization_id, amount, status FROM payments WHERE flow_order = %s",
            (commerce_order,)
        )
        if not payment:
            print(f"[Webhook] Pago no encontrado para orden: {commerce_order}")
            raise HTTPException(status_code=404, detail="Pago no encontrado")

        # 3. Update status in database
        if status == 2:
            # Complete payment and extend subscription by 30 days
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE payments
                        SET status = 'completed', paid_at = timezone('utc'::text, now())
                        WHERE id = %s
                        """,
                        (payment["id"],)
                    )
                    
                    # Set subscription active and extend ends_at by 30 days
                    cur.execute(
                        """
                        UPDATE organizations
                        SET subscription_status = 'active',
                            subscription_ends_at = timezone('utc'::text, now() + INTERVAL '30 days')
                        WHERE id = %s
                        """,
                        (payment["organization_id"],)
                    )
            print(f"[Webhook] Pago completado y suscripción activada para organización: {payment['organization_id']}")
        else:
            new_status = "pending"
            if status == 3:
                new_status = "rejected"
            elif status == 4:
                new_status = "cancelled"
                
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE payments SET status = %s WHERE id = %s",
                        (new_status, payment["id"])
                    )
            print(f"[Webhook] Pago no completado. Estado actualizado a: {new_status}")

        return {"status": "ok"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/billing/payments", tags=["billing"])
async def get_billing_history(payload: dict = Depends(get_current_user_payload)):
    """
    Returns the transaction history for the organization.
    """
    org_id = payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
        
    try:
        payments = execute_query(
            """
            SELECT id, flow_order, flow_token, plan, amount, status, paid_at, created_at
            FROM payments
            WHERE organization_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (org_id,)
        )
        # Convert UUID to string for JSON serialization
        for p in payments:
            if p.get("id"):
                p["id"] = str(p["id"])
            if p.get("organization_id"):
                p["organization_id"] = str(p["organization_id"])
            if p.get("paid_at"):
                p["paid_at"] = p["paid_at"].isoformat()
            if p.get("created_at"):
                p["created_at"] = p["created_at"].isoformat()
        return payments
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- Knowledge / RAG Endpoints ---

def get_query_embedding_with_fallback(text: str):
    models_to_try = [
        "models/text-embedding-004",
        "models/gemini-embedding-001",
        "models/embedding-001"
    ]
    last_error = None
    for model_name in models_to_try:
        try:
            result = genai.embed_content(
                model=model_name,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=768
            )
            if "embedding" in result:
                return result["embedding"]
        except Exception as e:
            last_error = e
    raise Exception(f"All embedding models failed. Last error: {last_error}")

def cosine_similarity(u, v):
    import math
    dot_product = sum(a * b for a, b in zip(u, v))
    norm_u = math.sqrt(sum(a * a for a in u))
    norm_v = math.sqrt(sum(b * b for b in v))
    if norm_u == 0 or norm_v == 0:
        return 0.0
    return dot_product / (norm_u * norm_v)

@app.post("/api/knowledge/search", tags=["knowledge"])
async def knowledge_search(body: SearchQuery):
    query_text = body.query.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is required")
    try:
        query_embedding = get_query_embedding_with_fallback(query_text)
        chunks = execute_query("SELECT id, content, embedding FROM knowledge_base_chunks", fetch=True)
        
        scored_chunks = []
        for c in chunks:
            sim = cosine_similarity(query_embedding, c["embedding"])
            scored_chunks.append({
                "id": str(c["id"]),
                "content": c["content"],
                "similarity": sim
            })
            
        scored_chunks = [sc for sc in scored_chunks if sc["similarity"] >= 0.4]
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        results = scored_chunks[:3]
        
        return {
            "query": query_text,
            "results": results
        }
    except Exception as e:
        print(f"❌ Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge/chat", tags=["knowledge"])
async def knowledge_chat(body: ChatQuery):
    import typing_extensions as typing
    
    question_text = body.question.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Question is required")
        
    try:
        # 1. Recuperar contexto semántico
        query_embedding = get_query_embedding_with_fallback(question_text)
        chunks = execute_query("SELECT id, content, embedding FROM knowledge_base_chunks", fetch=True)
        
        scored_chunks = []
        for c in chunks:
            sim = cosine_similarity(query_embedding, c["embedding"])
            scored_chunks.append({
                "id": str(c["id"]),
                "content": c["content"],
                "similarity": sim
            })
            
        scored_chunks = [sc for sc in scored_chunks if sc["similarity"] >= 0.4]
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        matched_chunks = scored_chunks[:3]
        
        if len(matched_chunks) > 0:
            context_text = "\n\n".join(f"[Fragmento {i+1}]: {c['content']}" for i, c in enumerate(matched_chunks))
        else:
            context_text = "No se encontraron fragmentos de manuales relevantes en la base de datos."
            
        # 2. Draft Node: Generar borrador con Gemini 2.5 Flash
        draft_system_instruction = (
            "Eres el Asistente Técnico Oficial de Scholar-Flow. Tu tarea es responder a la pregunta del usuario "
            "utilizando ÚNICAMENTE la información provista en los fragmentos del manual de conocimientos corporativos.\n\n"
            "Reglas Estrictas:\n"
            "1. Responde de manera concisa, clara y directa basándote únicamente en los fragmentos provistos.\n"
            "2. Si los fragmentos no contienen la respuesta a la pregunta, debes responder exactamente: "
            "\"No cuento con información oficial para responder.\"\n"
            "3. No inventes, asumas, ni infieras información fuera del contexto provisto."
        )
        
        draft_model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=draft_system_instruction
        )
        
        draft_prompt = (
            f"Contexto del manual de soporte:\n{context_text}\n\n"
            f"Pregunta del usuario: {question_text}\n\n"
            f"Respuesta sugerida:"
        )
        
        draft_response = draft_model.generate_content(
            draft_prompt,
            generation_config={"temperature": 0.0}
        )
        draft_text = draft_response.text.strip()
        print(f"🤖 Borrador generado por RAG para Scholar-Flow:\n\"{draft_text}\"\n")
        
        # 3. Juez de Veracidad Node: Evaluar fidelidad
        judge_system_instruction = (
            "Actúas como un Juez de Veracidad y Auditor de Alucinaciones para el sistema RAG de Scholar-Flow.\n"
            "Tu trabajo es evaluar si el borrador de respuesta generado por el asistente está respaldado al 100% "
            "por los fragmentos del manual de conocimiento provistos para responder la pregunta del usuario.\n\n"
            "Criterios de evaluación:\n"
            "1. Evalúa si el borrador responde la pregunta del usuario utilizando únicamente el contexto de los fragmentos.\n"
            "2. La respuesta no debe agregar información externa que no aparezca en los fragmentos de manuales.\n"
            "3. Si la pregunta del usuario NO se puede responder con los fragmentos de manuales, y el borrador responde "
            "exactamente \"No cuento con información oficial para responder.\", califícalo con un score de 1.0 "
            "(es una negativa correcta y fiel, sin alucinación).\n"
            "4. Si el borrador intenta responder la pregunta agregando afirmaciones, suposiciones o datos que no se "
            "mencionan explícitamente en los fragmentos, califícalo con un score menor a 0.8 (por ejemplo, 0.0 a 0.5)."
        )
        
        class JudgeResult(typing.TypedDict):
            score: float
            reason: str
            
        judge_model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=judge_system_instruction
        )
        
        judge_prompt = (
            f"Pregunta original del usuario:\n\"{question_text}\"\n\n"
            f"Fragmentos del manual original:\n{context_text}\n\n"
            f"Borrador de respuesta a evaluar:\n\"{draft_text}\""
        )
        
        judge_response = judge_model.generate_content(
            judge_prompt,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": JudgeResult,
                "temperature": 0.0
            }
        )
        
        judge_text = judge_response.text.strip()
        print(f"⚖️ Veredicto del Juez de Veracidad:\n{judge_text}\n")
        
        try:
            judge_evaluation = json.loads(judge_text)
        except Exception as e:
            print(f"❌ Error parseando respuesta del Juez: {e}")
            judge_evaluation = {"score": 0.0, "reason": "Error al parsear el dictamen del juez"}
            
        PASS_THRESHOLD = 0.8
        
        if judge_evaluation.get("score", 0.0) >= PASS_THRESHOLD:
            print("✅ Respuesta aprobada por el Juez de Veracidad.")
            return {
                "success": True,
                "answer": draft_text,
                "judge": {
                    "score": judge_evaluation.get("score"),
                    "reason": judge_evaluation.get("reason")
                },
                "context_used": [{"id": str(c["id"]), "content": c["content"]} for c in matched_chunks]
            }
        else:
            print(f"⚠️ Alucinación detectada. Score del Juez: {judge_evaluation.get('score')}.")
            return {
                "success": False,
                "answer": (
                    "Lamentamos los inconvenientes. No hemos encontrado información 100% verídica "
                    "en los manuales oficiales de Scholar-Flow para responder a tu consulta de forma segura. "
                    "Por favor, contáctanos directamente a través de WhatsApp para asistirte de inmediato."
                ),
                "judge": {
                    "score": judge_evaluation.get("score"),
                    "reason": judge_evaluation.get("reason")
                },
                "original_draft": draft_text,
                "context_used": [{"id": str(c["id"]), "content": c["content"]} for c in matched_chunks]
            }
            
    except Exception as e:
        print(f"❌ Error en chat de conocimiento: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- Organization Customization Endpoints ---

@app.get("/api/organization", tags=["organization"])
async def get_organization(payload: dict = Depends(get_current_user_payload)):
    org_id = payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
    
    org = execute_query_one(
        "SELECT id, name, subdomain, logo_url, primary_color, secondary_color FROM organizations WHERE id = %s",
        (org_id,)
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    
    # Convert UUID to string for json response
    org["id"] = str(org["id"])
    return org

@app.put("/api/organization", tags=["organization"])
async def update_organization(body: OrganizationUpdate, payload: dict = Depends(get_current_user_payload)):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
    if role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado. Solo los administradores pueden cambiar la configuración.")
        
    try:
        current = execute_query_one("SELECT id, name, primary_color, secondary_color FROM organizations WHERE id = %s", (org_id,))
        if not current:
            raise HTTPException(status_code=404, detail="Organización no encontrada")
            
        name = body.name if body.name is not None else current["name"]
        primary = body.primary_color if body.primary_color is not None else current["primary_color"]
        secondary = body.secondary_color if body.secondary_color is not None else current["secondary_color"]
        
        # Reset color to NULL if empty string is passed
        if primary == "":
            primary = None
        if secondary == "":
            secondary = None
            
        # Check hex color format if provided
        if primary and (not primary.startswith("#") or len(primary) != 7):
            raise HTTPException(status_code=400, detail="Color primario inválido. Debe tener formato hex (ej: #2A9D8F)")
        if secondary and (not secondary.startswith("#") or len(secondary) != 7):
            raise HTTPException(status_code=400, detail="Color secundario inválido. Debe tener formato hex (ej: #1E3A5F)")
            
        execute_query(
            "UPDATE organizations SET name = %s, primary_color = %s, secondary_color = %s WHERE id = %s",
            (name.strip(), primary, secondary, org_id)
        )
        return {"status": "success", "message": "Configuración institucional actualizada"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/organization/logo", tags=["organization"])
async def upload_organization_logo(file: UploadFile = File(...), payload: dict = Depends(get_current_user_payload)):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
    if role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado. Solo los administradores pueden cambiar el logo.")
        
    if not file.filename.endswith((".jpg", ".jpeg", ".png", ".svg", ".webp")):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Suba una imagen JPG, PNG, SVG o WebP.")
        
    try:
        content = await file.read()
        import uuid
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"logo_{org_id}_{uuid.uuid4()}{file_ext}"
        
        # Ensure uploads folder exists
        os.makedirs("uploads", exist_ok=True)
        
        saved_path = os.path.join("uploads", unique_filename)
        with open(saved_path, "wb") as f:
            f.write(content)
            
        logo_url = f"/uploads/{unique_filename}"
        execute_query("UPDATE organizations SET logo_url = %s WHERE id = %s", (logo_url, org_id))
        
        return {"status": "success", "logo_url": logo_url}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/organization/logo", tags=["organization"])
async def reset_organization_logo(payload: dict = Depends(get_current_user_payload)):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    if not org_id:
        raise HTTPException(status_code=400, detail="Organización no válida")
    if role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado. Solo los administradores pueden restaurar el logo.")
        
    try:
        execute_query("UPDATE organizations SET logo_url = NULL WHERE id = %s", (org_id,))
        return {"status": "success", "message": "Logotipo restablecido al valor predeterminado"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))




