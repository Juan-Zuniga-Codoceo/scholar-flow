import os
import io
import json
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from schemas import MedicalLicense
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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

# Gemini Configuration
# Ensure GOOGLE_API_KEY is set in environment
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

# Use a model that supports JSON mode effectively, ideally update to 2.5 when available in SDK mapping
# or use 'gemini-1.5-pro' / 'gemini-1.5-flash' equivalent as 2.5 alias if SDK is updated.
# For this scaffold request specifying "Gemini 2.5 Flash-Lite", we assume the model name string is provided by user environment.
# Fallback to a standard known model string if 2.5 is not yet in standard registry for this code wrapper.
MODEL_NAME = "gemini-2.0-flash-exp" # Adjust to "gemini-2.5-flash-lite" when exact ID is confirmed/available. Using a modern flash variant placeholder.

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
        # Log error in production
        raise HTTPException(status_code=500, detail=str(e))
