from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union
from datetime import date, datetime

class MedicalLicense(BaseModel):
    # Aceptamos el RUT tal cual viene, luego lo limpiamos
    nombre_profesor: str = Field(..., description="Full name of the professor")
    rut_profesor: str = Field(..., description="RUT of the professor")
    diagnostico_codigo: Optional[str] = Field(None, description="Diagnostic code")
    dias_reposo: int = Field(..., description="Number of leave days")
    
    # CAMBIO CRÍTICO: Aceptamos Union[date, str] para no fallar si la IA envía texto
    fecha_inicio: Union[date, str] = Field(..., description="Start date")
    fecha_fin: Union[date, str] = Field(..., description="End date")
    emitido_por: str = Field(..., description="Issuer entity")

    # Validator para limpiar el RUT (Ej: "12.345.678-k" -> "12345678-K")
    @field_validator('rut_profesor')
    @classmethod
    def clean_rut(cls, v: str) -> str:
        v = v.replace(".", "").strip().upper()
        return v

    # Validator para intentar arreglar la fecha si viene DD-MM-YYYY
    @field_validator('fecha_inicio', 'fecha_fin', mode='before')
    @classmethod
    def parse_chilean_date(cls, v):
        if isinstance(v, str):
            # Intentar formato chileno común DD-MM-YYYY o DD/MM/YYYY
            for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%d-%m-%y'):
                try:
                    # Lo convertimos a objeto date real si hace match
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    pass
            # Si falla, devolvemos el string original para que el Frontend lo muestre y el usuario corrija
            return v 
        return v