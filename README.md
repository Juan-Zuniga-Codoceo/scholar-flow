# Scholar Flow — Plataforma SaaS de Gestión Educativa Inteligente

Scholar Flow es un software como servicio (SaaS) moderno y premium diseñado para optimizar la administración escolar de establecimientos educativos (colegios, liceos y escuelas). La plataforma utiliza inteligencia artificial para resolver problemáticas complejas de planificación de horarios y coordinar reemplazos automáticos por licencias médicas.

## 🚀 Características Principales

*   **Generador de Horarios con IA (Gemini)**: Optimiza y distribuye los bloques de clases semanales de forma automática, libre de colisiones, respetando restricciones de profesores, cursos, salas y contratos.
*   **Gestión Inteligente de Licencias Médicas**: Automatiza el flujo de licencias médicas del personal docente, buscando de inmediato reemplazos idóneos con horas disponibles.
*   **Portal Docente y Agenda**: Perfil seguro y privado para profesores donde pueden registrar notas, planificaciones, gestionar su agenda y solicitar días administrativos.
*   **Facturación Integrada (Flow)**: Facturación SaaS en pesos chilenos basada en usuarios activos bajo un modelo de suscripción mensual con 14 días de prueba gratuitos.
*   **Exportación Profesional**: Descarga de horarios semanales y reportes en formatos PDF y Excel.

---

## 🛠️ Arquitectura y Tecnologías

La plataforma utiliza un modelo de monorepositorio estructurado:

*   **Frontend (`apps/web`)**: Next.js 15 (React 19), Tailwind CSS para estilos de marca, y componentes interactivos premium.
*   **Backend (`apps/api`)**: FastAPI (Python 3), Uvicorn, PostgreSQL, y autenticación JWT con algoritmos hash seguros.
*   **Base de Datos**: PostgreSQL con soporte relacional completo y gestión de organizaciones (multi-tenancy).

---

## 💻 Configuración del Entorno de Desarrollo

### 1. Requisitos Previos

*   Node.js (v18+)
*   Python 3.10+
*   PostgreSQL local o en la nube

---

### 2. Backend (FastAPI)

1.  Navega a la carpeta de la API:
    ```bash
    cd apps/api
    ```
2.  Crea un entorno virtual e instala las dependencias:
    ```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
3.  Crea tu archivo `.env` configurando las siguientes variables base:
    ```env
    DATABASE_URL=postgresql://<usuario>:<password>@localhost:5432/scholarflow_dev
    JWT_SECRET=tu_clave_secreta_jwt
    JWT_ALGORITHM=HS256
    FLOW_API_KEY=tu_api_key_flow
    FLOW_SECRET_KEY=tu_secret_key_flow
    FLOW_SANDBOX=true
    ```
4.  Inicia el servidor backend en modo de desarrollo:
    ```bash
    uvicorn main:app --reload
    ```

---

### 3. Frontend (Next.js)

1.  Navega a la raíz del monorepositorio o a la app web:
    ```bash
    cd apps/web
    ```
2.  Instala las dependencias de Node:
    ```bash
    npm install
    ```
3.  Crea tu archivo `.env.local`:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```
4.  Inicia el servidor frontend:
    ```bash
    npm run dev
    ```

Accede al entorno de desarrollo desde [http://localhost:3000](http://localhost:3000).

---

## 🎨 Identidad de Marca y UI

*   **Colores Corporativos**: Navy (`#1E3A5F`), Blue (`#264B8A`), Teal (`#2A9D8F`), Green (`#52B788`).
*   **Alineación de Diseño**: Tipografía Google Fonts Outfit/Inter, componentes visuales pulidos con sombras estilizadas de marca y transiciones fluidas.

---

Desarrollado y mantenido con ❤️ por [Synapse Dev](https://www.synapsedev.cl).
