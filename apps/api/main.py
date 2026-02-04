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

# Load environment variables from .env file with explicit path
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

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
