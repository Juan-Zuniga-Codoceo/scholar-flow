import os
import io
import json
import traceback
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from schemas import MedicalLicense
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file with explicit path
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Supabase Configuration
# NOTE: These values must be set in .env for this to work
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") # Use Service Role Key for backend

supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Warning: Failed to initialize Supabase: {e}")
else:
    print("⚠️ Warning: SUPABASE_URL or SUPABASE_KEY not found in environment")

# Initialize FastAPI
app = FastAPI(title="Synapse AI Engine")

# CORS Configuration
origins = [
    "http://localhost:3000",
    # Add production domain here later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Configuration - Validate API Key at startup
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("\n" + "="*60)
    print("❌ FALTA .ENV: GOOGLE_API_KEY no está configurada")
    print("Crea un archivo .env en apps/api/ con:")
    print("GOOGLE_API_KEY=tu_api_key_aqui")
    print("="*60 + "\n")
    raise ValueError("GOOGLE_API_KEY is required but not found in environment")

genai.configure(api_key=api_key)

# Use Gemini Flash Latest (Stable Alias) - Better quota limits than 2.0-flash
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

@app.get("/")
def read_root():
    return {"status": "active", "service": "Synapse Scholar-Flow AI Engine"}

@app.post("/extract-license", response_model=MedicalLicense)
async def extract_license(file: UploadFile = File(...)):
    if not file.filename.endswith((".pdf", ".jpg", ".jpeg", ".png")):
         raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or Image.")

    try:
        # Read file into memory (Privacy by Design: No disk save)
        content = await file.read()
        
        # Determine mime type
        mime_type = file.content_type or "application/pdf"

        # Prepare generation config for JSON
        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }

        # Initialize Model
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_PROMPT,
            generation_config=generation_config
        )

        # Generate content
        # Pass the content bytes directly if supported by SDK utility or wrap in Part object
        # simpler approach for 'google-generativeai' library with bytes:
        response = model.generate_content(
            [
                {"mime_type": mime_type, "data": content},
                "Extract data from this medical license."
            ]
        )

        # Parse JSON
        try:
            json_data = json.loads(response.text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned invalid JSON structure.")

        # Validate with Pydantic (will raise 422 if invalid)
        validated_data = MedicalLicense(**json_data)
        
        return validated_data

    except Exception as e:
        # Print full traceback for debugging
        print("\n" + "="*60)
        print("❌ ERROR EN /extract-license:")
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=f"Error procesando licencia: {str(e)}")

@app.post("/licenses")
async def create_license(license: MedicalLicense):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection not available")

    try:
        # 1. Get a valid Organization ID (MVP Hack: Get the first one found)
        # In production, this would come from the authenticated user's session
        org_res = supabase.table("organizations").select("id").limit(1).execute()
        
        if not org_res.data:
             # Create a default org if none exists (Auto-scaffold for dev)
             default_org = {
                 "name": "Demo School",
                 "slug": "demo-school",
                 "plan_type": "free"
             }
             org_res = supabase.table("organizations").insert(default_org).execute()
        
        organization_id = org_res.data[0]['id']

        # 2. Map Pydantic schema to Database Schema
        data = license.model_dump()
        
        # Helper to serializar dates
        def serialize_date(d):
            return d.isoformat() if hasattr(d, 'isoformat') else d

        # 3. Map to User's SQL Schema
        # User defined schema:
        # id, organization_id, user_id, professor_rut, professor_name, start_date, end_date, days_count, status, file_url, extracted_data
        
        db_payload = {
            "organization_id": organization_id,
            "professor_name": data['nombre_profesor'],
            "professor_rut": data['rut_profesor'],
            "days_count": data['dias_reposo'],
            "start_date": serialize_date(data['fecha_inicio']),
            "end_date": serialize_date(data['fecha_fin']),
            "status": "pending", # User schema default
            "extracted_data": {
                "diagnosis_code": data.get('diagnostico_codigo'),
                "health_entity": data['emitido_por'],
                "full_extraction": json.loads(license.model_dump_json())
            }
        }

        # 4. Insert into Supabase
        response = supabase.table("medical_licenses").insert(db_payload).execute()
        
        return {"status": "success", "id": response.data[0]['id'], "data": response.data[0]}

    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR EN /licenses:")
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
