import random
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def generate_rut():
    numero = random.randint(10000000, 25000000)
    # Algoritmo simplificado solo para visualización, no valida mod11 real
    dv = str(random.randint(0, 9)) 
    return f"{numero:,}".replace(",", ".") + "-" + dv

def create_fake_license(filename="licencia_test.pdf"):
    c = canvas.Canvas(filename, pagesize=LETTER)
    width, height = LETTER
    
    # 1. Encabezado
    c.setStrokeColorRGB(0.2, 0.4, 0.6)
    c.setLineWidth(2)
    c.rect(50, height - 150, 500, 100, stroke=1, fill=0)
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(70, height - 80, "FORMULARIO DE LICENCIA MÉDICA ELECTRÓNICA")
    c.setFont("Helvetica", 10)
    c.drawString(70, height - 100, "COMPIN / CAJA DE COMPENSACIÓN / ISAPRE")
    
    # Datos Generados
    rut_profesor = generate_rut()
    rut_medico = generate_rut()
    dias = random.choice([3, 5, 7, 11, 15, 30])
    
    # Fechas (Usando formato chileno DD-MM-YYYY para probar tu parser)
    inicio = datetime.now() + timedelta(days=random.randint(1, 10))
    fin = inicio + timedelta(days=dias - 1)
    
    fecha_inicio_str = inicio.strftime("%d-%m-%Y")
    fecha_fin_str = fin.strftime("%d-%m-%Y")

    # 2. Sección A: Identificación del Trabajador
    y = height - 200
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "A. IDENTIFICACIÓN DEL TRABAJADOR")
    
    c.setFont("Helvetica", 11)
    c.drawString(50, y - 25, f"Nombre: JUAN PÉREZ ALEATORIO")
    c.drawString(350, y - 25, f"RUT: {rut_profesor}")
    
    # 3. Sección B: Reposo y Diagnóstico
    y = height - 280
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "B. TIPO DE LICENCIA Y REPOSO")
    
    c.rect(50, y - 100, 500, 90, stroke=1, fill=0)
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, y - 30, "DIAGNÓSTICO PRINCIPAL:")
    c.setFont("Helvetica", 10)
    c.drawString(220, y - 30, random.choice(["Gripe Aviar", "Lumbago Mecánico", "Trastorno de Ansiedad", "Fractura Tibia"]))
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, y - 60, "FECHA INICIO REPOSO:")
    c.setFont("Helvetica", 12)
    c.drawString(220, y - 60, fecha_inicio_str) # Dato crítico
    
    c.setFont("Helvetica-Bold", 10)
    c.drawString(350, y - 60, "N° DÍAS:")
    c.setFont("Helvetica", 12)
    c.drawString(420, y - 60, str(dias)) # Dato crítico
    
    c.setFont("Helvetica", 9)
    c.drawString(60, y - 85, f"Fecha Término: {fecha_fin_str}")

    # 4. Sección C: Profesional
    y = height - 450
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "C. IDENTIFICACIÓN DEL PROFESIONAL")
    
    c.setFont("Helvetica", 10)
    c.drawString(50, y - 30, f"Nombre Profesional: DR. HOUSE TESTER")
    c.drawString(50, y - 50, f"RUT Profesional: {rut_medico}")
    c.drawString(50, y - 70, "Especialidad: MEDICINA GENERAL")
    c.drawString(50, y - 90, f"Fecha Emisión: {datetime.now().strftime('%d-%m-%Y')}")
    
    # Firma falsa
    c.setStrokeColor(colors.blue)
    c.line(350, y - 80, 500, y - 80)
    c.drawString(380, y - 95, "Firma Electrónica")

    c.save()
    print(f"✅ Archivo generado: {filename}")
    print(f"   Datos clave -> Inicio: {fecha_inicio_str}, Días: {dias}, RUT Profe: {rut_profesor}")

if __name__ == "__main__":
    create_fake_license()