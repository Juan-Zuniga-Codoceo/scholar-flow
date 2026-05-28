# Scholar-Flow: Documentación Técnica de Funcionalidades Clave

Esta documentación detalla los aspectos técnicos, de base de datos, flujos de datos e integraciones de las funcionalidades implementadas en la plataforma SaaS **Scholar-Flow**.

---

## Índice
1. [Suscripción Demo Gratuita y Modelo de Facturación](#1-suscripción-demo-gratuita-y-modelo-de-facturación)
2. [Semilla de Datos de Demostración (Seeding)](#2-semilla-de-datos-de-demostración-seeding)
3. [Gestión Inteligente de Licencias Médicas con IA](#3-gestión-inteligente-de-licencias-médicas-con-ia)
4. [Navegación Fluida a Fichas de Docentes](#4-navegación-fluida-a-fichas-de-docentes)
5. [Módulo Interactivo: Guía de Uso](#5-módulo-interactivo-guía-de-uso)

---

## 1. Suscripción Demo Gratuita y Modelo de Facturación

### Propósito
La plataforma requiere un mecanismo para que los clientes potenciales exploren las características de Scholar-Flow sin barreras de pago, manteniendo el acceso de por vida para la cuenta de demostración institucional oficial.

### Detalles de Implementación
*   **Identificador de Organización Demo**: El sistema reserva el UUID fijo `'00000000-0000-0000-0000-000000000000'` para la institución de pruebas.
*   **Columna de Base de Datos**: La tabla `organizations` incluye la columna `is_demo BOOLEAN DEFAULT FALSE`.
*   **Exención de Bloqueo de Facturación**: 
    - En el backend (`apps/api/main.py`), los decoradores o validaciones de suscripción activa verifican si `is_demo` es `true`.
    - Si la organización tiene activa la bandera de demo, se omite el bloqueo de pasarela de pago (Flow/MercadoPago), permitiendo acceso perpetuo al optimizador de horarios y recomendador por IA.

---

## 2. Semilla de Datos de Demostración (Seeding)

### Propósito
Proporcionar un entorno de simulación realista e interactivo con datos escolares preestablecidos al reiniciar el servidor o inicializar bases de datos de desarrollo.

### Estructura del Script (`apps/api/seed_demo_data.py`)
El script limpia la base de datos en orden inverso de dependencia y luego inserta:
1.  **Organización y Usuario**: Crea la organización con UUID demo y un usuario administrador (`admin@demo.scholarflow.app`, clave hash `1234`).
2.  **Nómina de Profesores (10 Docentes)**: Registra datos realistas de contacto (`email`, `phone`), RUTs válidos, tipo de contrato (Planta, Reemplazo, Honorarios), cantidad de horas contratadas e inicializadas en 0 asignadas.
3.  **Cursos y Asignaturas**: Configura la malla desde 1° Medio hasta 4° Medio con sus respectivas asignaturas de especialidad.
4.  **Licencias Médicas Activas**: Inserta licencias históricas y activas con diagnósticos realistas de ejemplo (CIE-10).
5.  **Bloques Horarios (Schedule Slots)**: Asigna bloques horarios para simular topes de calendario y carga laboral real.

---

## 3. Gestión Inteligente de Licencias Médicas con IA

### Propósito
Optimizar el tiempo de los administradores mediante la lectura automática de licencias médicas físicas (PDF/Imágenes) y la recomendación algorítmica de suplentes calificados.

### Flujo de Datos Técnico

- **Subida de Archivos**: Al subir una licencia, se almacena de forma persistente en el backend (`apps/api/uploads/`) con un nombre único y se registra en `file_path`.
- **Extracción Inteligente**: Gemini 2.5 Flash-Lite extrae información clave estructurada en JSON.
- **Visualización de Original**: El frontend carga el documento guardado mediante enlaces dinámicos en la tabla de historial y en el optimizador de reemplazos lateral.

### Motor de Recomendación de Suplentes
El algoritmo de recomendación prioriza a los docentes bajo las siguientes reglas:
1.  **Especialidad**: Coincidencia directa de la asignatura requerida con la nómina de asignaturas del profesor.
2.  **Disponibilidad Horaria**: El profesor debe tener marcada la casilla de disponibilidad para reemplazos.
3.  **Capacidad de Carga**: Compara las horas asignadas actuales contra su límite de contrato, ordenando de forma ascendente para equilibrar la carga laboral del establecimiento.

---

## 4. Navegación Fluida a Fichas de Docentes

### Propósito
Garantizar una experiencia de usuario integrada al conectar el panel de licencias médicas directamente con el expediente individual de cada profesor sin necesidad de búsquedas manuales.

### Mecanismo de Redirección
1.  **Hipervínculo**: En el listado de licencias médicas, el nombre de los docentes es un enlace Next.js:
    ```tsx
    <Link href={`/dashboard/profesores?view=${encodeURIComponent(professorName)}`}>
    ```
2.  **Parámetro URL**: La página `/dashboard/profesores` utiliza el hook `useSearchParams` de Next.js.
3.  **Apertura Automática**: Si el parámetro `view` está presente al cargar la página, se busca al profesor en el listado y se asigna inmediatamente al estado `viewingProf`, disparando de forma reactiva la modal de detalles con su carga horaria y datos de contacto.

---

## 5. Módulo Interactivo: Guía de Uso

### Propósito
Ofrecer un centro de aprendizaje interactivo dentro de la aplicación para que los usuarios finales y clientes de prueba dominen el uso del recomendador por IA y el planificador de clases.

### Componentes de la Interfaz (`/dashboard/tutorial`)
*   **Encabezado Hero**: Diseñado con un fondo oscuro de alta fidelidad, gradientes de marca y un patrón de cuadrícula escolar.
*   **Pestañas Navegables**:
    - **Conceptos Generales**: Vista de tarjetas generales de los módulos.
    - **Gestión de Licencias e IA**: Flujo numérico interactivo (1 al 4) que ilustra el ciclo de vida de una licencia médica y el procesamiento inteligente.
    - **Planificación de Horarios**: Guía técnica de distribución de bloques.
*   **Sección de Preguntas Frecuentes (FAQs)**:
    - Acordeón interactivo de preguntas administrativas comunes.
    - Respuestas detalladas sobre el funcionamiento del recomendador algorítmico y políticas de carga horaria.

---

## 6. Asistente Técnico y Chatbot Inteligente de Soporte (RAG + Juez)

### Propósito
Proporcionar asistencia técnica interactiva contextualizada a los administradores dentro del panel de Scholar-Flow, con total veracidad en las respuestas basadas únicamente en los manuales de la organización para evitar alucinaciones.

### Componentes Técnicos y Flujos de Datos

```mermaid
graph TD
    User[Usuario: Ingresa duda en Widget] --> API[POST /api/knowledge/chat]
    API --> Embed[Gemini Embedding 001]
    Embed --> VectorMatch[Búsqueda Semántica: PostgreSQL double precision array]
    VectorMatch --> Matched[Top 3 Fragmentos Coincidentes]
    Matched --> DraftNode[Generador de Borrador: Gemini 2.5 Flash]
    DraftNode --> JudgeNode[Juez de Veracidad: Auditoría con Structured JSON Output]
    JudgeNode --> Gate{¿Score del Juez >= 0.8?}
    Gate -- Sí --> Approved[Retornar Respuesta Aprobada con Badge de Verificación]
    Gate -- No --> Fallback[Retornar Fallback Seguro y Botón de Soporte WhatsApp]
```

### 1. Ingesta y Base Vectorial (`apps/api/seed_knowledge.py`)
*   **Manual Corporativo**: El manual se encuentra en `apps/api/data/knowledge_scholarflow.txt`, cubriendo administración, licencias, recomendación y la exención demo.
*   **Ventana Deslizante**: El script Python segmenta el manual en fragmentos (chunks) de 500 caracteres con un traslape de 100 caracteres.
*   **Vectorización**: Utiliza el modelo `models/gemini-embedding-001` configurado a una dimensionalidad exacta de 768 float values.
*   **Almacenamiento**: Los vectores se guardan en la columna `embedding DOUBLE PRECISION[]` en la tabla `knowledge_base_chunks` en PostgreSQL.

### 2. Pipeline RAG y Gating de Alucinaciones (`apps/api/main.py`)
*   **Búsqueda Semántica**: Calcula la similitud coseno pura en Python entre el vector de consulta y los fragmentos de la base de datos:
    $$\text{similitud} = \frac{u \cdot v}{\|u\| \|v\|}$$
*   **Generador RAG (Draft Node)**: Con un modelo `gemini-2.5-flash` y `temperature: 0.0`, redacta la respuesta basándose estrictamente en el contexto recuperado.
*   **Juez de Veracidad (Judge Node)**: Utiliza Gemini con salida JSON estructurada (`response_schema`) para calificar la fidelidad de la respuesta de `0.0` a `1.0`.
*   **Control de Calidad**: Si el score del juez es menor a `0.8`, la respuesta se intercepta para evitar alucinaciones, entregando un mensaje seguro y sugiriendo contactar a soporte por WhatsApp.

### 3. Interfaz de Usuario (`apps/web/components/dashboard/ChatbotWidget.tsx`)
*   **Floating Widget**: Ubicado de forma fija en la esquina inferior derecha con un botón animado de pulso.
*   **Historial de Mensajería**: Muestra el chat en tiempo real.
*   **Soporte Humano Integrado**: Si la IA no conoce la respuesta verídica, habilita un botón directo para abrir chat de soporte oficial en WhatsApp (+56940413646).
*   **Medalla de Verificación**: Las respuestas correctas muestran un badge indicando que fueron validadas y el porcentaje de fidelidad devuelto por el Juez de Veracidad.

---

## 7. Modelo de Facturación y Pasarela de Pagos (Mercado Pago)

### Propósito
Proporcionar un sistema de cobro dinámico tipo SaaS basado en licencias activas (seats), con cobros manuales para evitar retenciones de tarjetas automáticas no deseadas para las instituciones chilenas.

### Endpoints y Arquitectura del Backend
*   **`GET /billing/status`**: Obtiene el estado actual de la suscripción, fecha de vencimiento (`subscription_ends_at`), número de usuarios activos registrados y calcula el costo mensual total según la regla:
    $$\text{Monto Mensual} = \text{Usuarios Activos} \times \text{Precio por Usuario}$$
*   **`POST /billing/pay`**: Genera una **Preferencia de Pago** en la API de Mercado Pago (`/checkout/preferences`) utilizando el Token de Acceso (`MP_ACCESS_TOKEN`). Devuelve el punto de inicio de la pasarela de pagos (`init_point`) y registra el pago como `pending` en la tabla local de transacciones.
*   **`POST /billing/webhook`**: Recibe notificaciones asíncronas automáticas (IPN) de Mercado Pago. Si el estado del pago es aprobado (`approved`/`2`), el webhook:
    1. Marca la transacción como `completed` en la base de datos local.
    2. Modifica el estado de suscripción de la organización a `active`.
    3. Extiende la fecha de vencimiento por exactamente **30 días** (`subscription_ends_at = ahora + 30 días`).
*   **`GET /billing/payments`**: Retorna el historial de transacciones realizadas por la organización para su control administrativo.

### Modelo de Suscripción Manual (Prepago)
*   **No Recurrente**: A diferencia de los cargos automáticos mensuales recurrentes, Scholar-Flow utiliza un modelo prepago manual. Las organizaciones pagan por un ciclo de 30 días de servicio.
*   **Vencimiento Transparente**: Al cumplirse los 30 días de la última transacción sin renovación, el acceso a las herramientas críticas de planificación y asignación de horarios se bloquea automáticamente en la UI, requiriendo un pago manual del administrador para reanudar operaciones. No se requiere un botón para desuscribirse ya que no se ejecutan cargos automáticos periódicos.

---

## 8. Eliminación del Perfil de la Institución (Danger Zone)

### Propósito
Permitir a los administradores el borrado absoluto de sus organizaciones y de toda la información confidencial de sus profesores de forma permanente e inmediata, conforme a los estándares de privacidad y seguridad de datos.

### Lógica de Control de Acceso y Backend (`DELETE /api/organization`)
*   **Restricción de Rol**: El endpoint valida a través de JWT que el rol del usuario que invoca la acción sea `"admin"`. Cualquier otro rol recibe un código de error `403 Forbidden`.
*   **Borrado en Cascada (Database Cascade)**: La base de datos PostgreSQL está estructurada con relaciones lógicas de clave foránea configuradas con la regla `ON DELETE CASCADE`. Al ejecutar la sentencia de borrado sobre la fila de la organización en la tabla `organizations`:
    - El motor de base de datos elimina de manera automática e inmediata todos los registros relacionados en las tablas de `users`, `professors`, `courses`, `schedule_slots`, `medical_licenses` y `payments`.

### Flujo de Confirmación en Interfaz de Usuario
1.  **Bloque de Zona de Peligro**: Visible únicamente para administradores en la parte inferior de la página de Personalización Institucional (`/dashboard/configuracion`).
2.  **Confirmación de Seguridad**: Al presionar "Eliminar Colegio", se le solicita al usuario escribir textualmente el nombre exacto de la institución. Si la cadena no coincide, la operación se cancela de forma inmediata.
3.  **Destrucción de Credenciales y Redirección**: Tras confirmarse la eliminación mediante la API:
    - Se borran los tokens de sesión locales mediante `clearSession()`.
    - Se eliminan las cookies de sesión del navegador.
    - Se redirige al navegador a la Landing Page principal (`/`).

---

## 9. Seguridad HTTP y Robustecimiento en Producción

### Capa de Servidor (Nginx Reverse Proxy)
Para salvaguardar la plataforma contra ataques comunes de hijacking de click y de inyección, el archivo de configuración del proxy inverso en el servidor Oracle Cloud (`/etc/nginx/sites-available/scholarflow`) incluye el endurecimiento mediante las siguientes cabeceras de seguridad HTTP:

```nginx
# Encabezados de Seguridad
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

*   **`X-Frame-Options`**: Previene ataques de Clickjacking prohibiendo la renderización del panel de Scholar-Flow dentro de iframes en sitios externos no autorizados.
*   **`X-Content-Type-Options`**: Impide que el navegador interprete archivos cargados como tipos MIME distintos a los declarados por el servidor.
*   **`X-XSS-Protection`**: Habilita el filtro de Scripting entre Sitios (XSS) integrado en navegadores heredados para forzar el bloqueo en caso de sospecha de ataque.


