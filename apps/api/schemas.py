from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union, List
from datetime import date, datetime

class MedicalLicense(BaseModel):
    nombre_profesor: str = Field(..., description="Full name of the professor")
    rut_profesor: str = Field(..., description="RUT of the professor")
    diagnostico_codigo: Optional[str] = Field(None, description="Diagnostic code")
    dias_reposo: int = Field(..., description="Number of leave days")
    fecha_inicio: Union[date, str] = Field(..., description="Start date")
    fecha_fin: Union[date, str] = Field(..., description="End date")
    emitido_por: str = Field(..., description="Issuer entity")
    file_path: Optional[str] = Field(None, description="Path or URL to the original uploaded file")

    @field_validator('rut_profesor')
    @classmethod
    def clean_rut(cls, v: str) -> str:
        v = v.replace(".", "").strip().upper()
        return v

    @field_validator('fecha_inicio', 'fecha_fin', mode='before')
    @classmethod
    def parse_chilean_date(cls, v):
        if isinstance(v, str):
            for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%d-%m-%y'):
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    pass
            return v 
        return v

class AssignmentRequest(BaseModel):
    professor_id: str = Field(..., description="UUID of the substitute professor")

# --- Professor Schemas ---
class ProfessorCreate(BaseModel):
    rut: str
    full_name: str
    subjects: List[str]
    contract_hours: int = 44
    contract_type: str = "planta"
    assigned_hours: int = 0
    is_available: bool = True
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_attention_hours: Optional[str] = None

    @field_validator('rut')
    @classmethod
    def clean_rut(cls, v: str) -> str:
        return v.replace(".", "").strip().upper()

class ProfessorUpdate(BaseModel):
    rut: Optional[str] = None
    full_name: Optional[str] = None
    subjects: Optional[List[str]] = None
    contract_hours: Optional[int] = None
    contract_type: Optional[str] = None
    assigned_hours: Optional[int] = None
    is_available: Optional[bool] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_attention_hours: Optional[str] = None

# --- Course Schemas ---
class CourseCreate(BaseModel):
    name: str
    homeroom_teacher_id: Optional[str] = None

class CourseUpdate(BaseModel):
    name: str
    homeroom_teacher_id: Optional[str] = None

# --- Course Subject Schemas ---
class CourseSubjectCreate(BaseModel):
    course_id: str
    subject_name: str
    weekly_hours: int
    professor_id: Optional[str] = None

class CourseSubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    weekly_hours: Optional[int] = None
    professor_id: Optional[str] = None

# --- Schedule Slot Schemas ---
class ScheduleSlotCreate(BaseModel):
    course_id: str
    course_subject_id: str
    day_of_week: int = Field(..., ge=1, le=5)
    period_number: int = Field(..., ge=1, le=8)

class ScheduleSlotBatch(BaseModel):
    course_id: str
    slots: List[ScheduleSlotCreate]

class OptimizeRequest(BaseModel):
    course_id: Optional[str] = None

# ─── Auth Schemas ──────────────────────────────────────────
class OrganizationRegister(BaseModel):
    """Payload to register a new institution (tenant) + its first admin user."""
    org_name: str = Field(..., min_length=2, description="Full name of the institution")
    subdomain: str = Field(..., min_length=2, description="Unique URL slug, e.g. 'colegio-sanpedro'")
    admin_email: str = Field(..., description="Admin email address")
    admin_password: str = Field(..., min_length=8, description="Admin password (min 8 chars)")
    admin_full_name: str = Field(..., min_length=2, description="Admin full name")

    @field_validator('subdomain')
    @classmethod
    def clean_subdomain(cls, v: str) -> str:
        import re
        slug = re.sub(r'[^a-z0-9-]', '-', v.lower().strip())
        slug = re.sub(r'-+', '-', slug).strip('-')
        if not slug:
            raise ValueError('Subdomain must contain at least one alphanumeric character')
        return slug

class UserLogin(BaseModel):
    email: str
    password: str

class OrgInfo(BaseModel):
    id: str
    name: str
    subdomain: str
    subscription_status: Optional[str] = "trialing"
    trial_ends_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

class UserInfo(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    professor_id: Optional[str] = None
    organization: OrgInfo

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo

# ─── Professor Portal Schemas ───────────────────────────────
class ProfessorInvite(BaseModel):
    """Payload for admin to create a portal account for a professor."""
    professor_id: str
    email: str
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None  # if None, use professors.full_name

class ProfessorProfileUpdate(BaseModel):
    """Fields a professor can edit on their own profile."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None

class ProfessorProfile(BaseModel):
    """Full professor profile returned from /professor/me."""
    id: str
    user_id: str
    full_name: str
    email: str
    phone: Optional[str]
    bio: Optional[str]
    rut: str
    subjects: Optional[List[str]]
    contract_type: str
    contract_hours: int
    assigned_hours: int
    is_available: bool
    organization: OrgInfo

# ─── Leave Request Schemas ───────────────────────────────────
class LeaveRequestCreate(BaseModel):
    """Payload for a professor to create a leave/admin-hours request."""
    request_type: str = Field(..., description="dia_admin | horas_admin | permiso")
    requested_date: date
    start_time: Optional[str] = Field(None, description="HH:MM format, for horas_admin")
    end_time:   Optional[str] = Field(None, description="HH:MM format, for horas_admin")
    reason: Optional[str] = None

    @field_validator('request_type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {'dia_admin', 'horas_admin', 'permiso'}
        if v not in allowed:
            raise ValueError(f"request_type must be one of {allowed}")
        return v

class LeaveRequestReview(BaseModel):
    """Payload for admin to approve or reject a leave request."""
    status: str = Field(..., description="approved | rejected")
    admin_comment: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in {'approved', 'rejected'}:
            raise ValueError("status must be 'approved' or 'rejected'")
        return v


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AgendaItemCreate(BaseModel):
    title: str = Field(..., min_length=1)
    content: Optional[str] = None
    category: str = Field(..., description="tarea | examen | reunion | recordatorio | otro")
    date: date
    start_time: Optional[str] = Field(None, description="HH:MM format")
    priority: str = Field("medium", description="low | medium | high")

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {'tarea', 'examen', 'reunion', 'recordatorio', 'otro'}
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = {'low', 'medium', 'high'}
        if v not in allowed:
            raise ValueError(f"priority must be one of {allowed}")
        return v


class AgendaItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[str] = None
    priority: Optional[str] = None
    is_completed: Optional[bool] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {'tarea', 'examen', 'reunion', 'recordatorio', 'otro'}
            if v not in allowed:
                raise ValueError(f"category must be one of {allowed}")
        return v

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {'low', 'medium', 'high'}
            if v not in allowed:
                raise ValueError(f"priority must be one of {allowed}")
        return v


class AgendaItemResponse(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    category: str
    date: date
    start_time: Optional[str] = None
    priority: str
    is_completed: bool
    created_at: datetime


class ExportScheduleRequest(BaseModel):
    course_id: str
    schedule_config: dict


class BillingStatusResponse(BaseModel):
    subscription_status: str
    trial_ends_at: Optional[datetime] = None
    trial_days_left: Optional[int] = None
    subscription_ends_at: Optional[datetime] = None
    active_users: int
    price_per_user: int
    total_monthly_amount: int


class PaySubscriptionRequest(BaseModel):
    url_return: str


class PaySubscriptionResponse(BaseModel):
    success: bool
    payment_url: Optional[str] = None
    error: Optional[str] = None
    amount: int


# --- Knowledge / RAG Schemas ---
class ChatQuery(BaseModel):
    question: str


class SearchQuery(BaseModel):
    query: str