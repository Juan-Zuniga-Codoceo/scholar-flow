import os
import sys
from datetime import datetime, timedelta

# Add the directory containing db.py to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection

def seed_data():
    demo_org_id = '00000000-0000-0000-0000-000000000000'
    demo_admin_id = '11111111-1111-1111-1111-111111111111'
    
    print("🌱 Starting to seed rich demo data...")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # 1. Clean up existing demo data in reverse dependency order
                print("🧹 Cleaning up old demo data...")
                
                # Delete schedule slots belonging to demo organization
                cur.execute("DELETE FROM schedule_slots WHERE organization_id = %s", (demo_org_id,))
                
                # Delete medical licenses belonging to demo organization
                cur.execute("DELETE FROM medical_licenses WHERE organization_id = %s", (demo_org_id,))
                
                # Delete course subjects belonging to demo organization's courses
                cur.execute("""
                    DELETE FROM course_subjects 
                    WHERE course_id IN (SELECT id FROM courses WHERE organization_id = %s)
                """, (demo_org_id,))
                
                # Delete courses belonging to demo organization
                cur.execute("DELETE FROM courses WHERE organization_id = %s", (demo_org_id,))
                
                # Delete professors belonging to demo organization
                cur.execute("DELETE FROM professors WHERE organization_id = %s", (demo_org_id,))
                
                # Delete demo admin user
                cur.execute("DELETE FROM users WHERE organization_id = %s AND role = 'admin'", (demo_org_id,))
                
                # Delete demo organization
                cur.execute("DELETE FROM organizations WHERE id = %s", (demo_org_id,))
                
                print("✨ Database cleaned. Inserting new demo organization and admin...")
                
                # 2. Insert Demo Organization
                cur.execute("""
                    INSERT INTO organizations (id, name, subdomain, subscription_status)
                    VALUES (%s, 'Colegio Demo', 'demo', 'free')
                """, (demo_org_id,))
                
                # 3. Insert Demo Admin User (Password is '1234')
                cur.execute("""
                    INSERT INTO users (id, email, password_hash, organization_id, full_name, role)
                    VALUES (%s, 'admin@demo.scholarflow.app', '$2b$12$pzzzK/mH9YMw8FlfuusCS.RPvLGXwwZoZjsinFxUV.kNWXoXPNL9.', %s, 'Administrador Demo', 'admin')
                """, (demo_admin_id, demo_org_id))
                
                # 4. Insert Demo Professors (10 professors)
                print("👨‍🏫 Seeding professors...")
                professors_data = [
                    ('f0000000-0000-0000-0000-000000000001', '11.111.111-1', 'Juan Pérez', ['Matemáticas', 'Física'], 44, 'planta', 36, True, 'juan.perez@colegiodemo.cl', '+56 9 1234 5678'),
                    ('f0000000-0000-0000-0000-000000000002', '22.222.222-2', 'Maria González', ['Lenguaje', 'Historia'], 30, 'honorarios', 24, True, 'maria.gonzalez@colegiodemo.cl', '+56 9 2345 6789'),
                    ('f0000000-0000-0000-0000-000000000003', '33.333.333-3', 'Carlos Ruiz', ['Biología', 'Química'], 44, 'planta', 30, True, 'carlos.ruiz@colegiodemo.cl', '+56 9 3456 7890'),
                    ('f0000000-0000-0000-0000-000000000004', '44.444.444-4', 'Ana Lopez', ['Inglés', 'Artes Visuales'], 22, 'reemplazo', 0, True, 'ana.lopez@colegiodemo.cl', '+56 9 4567 8901'),
                    ('f0000000-0000-0000-0000-000000000005', '55.555.555-5', 'Pedro Soto', ['Educación Física', 'Música'], 40, 'planta', 32, True, 'pedro.soto@colegiodemo.cl', '+56 9 5678 9012'),
                    ('f0000000-0000-0000-0000-000000000006', '66.666.666-6', 'Sofia Vergara', ['Matemáticas', 'Tecnología'], 44, 'reemplazo', 0, True, 'sofia.vergara@colegiodemo.cl', '+56 9 6789 0123'),
                    ('f0000000-0000-0000-0000-000000000007', '77.777.777-7', 'Diego Torres', ['Historia', 'Geografía'], 30, 'honorarios', 12, True, 'diego.torres@colegiodemo.cl', '+56 9 7890 1234'),
                    ('f0000000-0000-0000-0000-000000000008', '88.888.888-8', 'Lucia Mendez', ['Inglés', 'Lenguaje'], 44, 'planta', 40, True, 'lucia.mendez@colegiodemo.cl', '+56 9 8901 2345'),
                    ('f0000000-0000-0000-0000-000000000009', '99.999.999-9', 'Roberto Diaz', ['Matemáticas', 'Física'], 44, 'reemplazo', 0, True, 'roberto.diaz@colegiodemo.cl', '+56 9 9012 3456'),
                    ('f0000000-0000-0000-0000-000000000010', '10.100.100-1', 'Andrea Rojas', ['Biología', 'Química'], 44, 'reemplazo', 0, True, 'andrea.rojas@colegiodemo.cl', '+56 9 0123 4567')
                ]
                for p_id, rut, name, subjs, hrs, c_type, ass_hrs, avail, email, phone in professors_data:
                    cur.execute("""
                        INSERT INTO professors (id, organization_id, rut, full_name, subjects, contract_hours, contract_type, assigned_hours, is_available, email, phone)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (p_id, demo_org_id, rut, name, subjs, hrs, c_type, ass_hrs, avail, email, phone))
                
                # 5. Insert Demo Courses (8 courses)
                print("🏫 Seeding courses...")
                courses_data = [
                    ('c0000000-0000-0000-0000-000000000001', '1° Medio A'),
                    ('c0000000-0000-0000-0000-000000000002', '2° Medio B'),
                    ('c0000000-0000-0000-0000-000000000003', '3° Medio A'),
                    ('c0000000-0000-0000-0000-000000000004', '4° Medio B'),
                    ('c0000000-0000-0000-0000-000000000005', '5° Básico A'),
                    ('c0000000-0000-0000-0000-000000000006', '6° Básico B'),
                    ('c0000000-0000-0000-0000-000000000007', '7° Básico A'),
                    ('c0000000-0000-0000-0000-000000000008', '8° Básico B')
                ]
                for c_id, name in courses_data:
                    cur.execute("""
                        INSERT INTO courses (id, organization_id, name)
                        VALUES (%s, %s, %s)
                    """, (c_id, demo_org_id, name))
                
                                # 6. Insert Course Subjects mapping
                print("📚 Seeding course subjects...")
                subjects_data = [
                    # 1° Medio A
                    ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
                    ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Física', 4, 'f0000000-0000-0000-0000-000000000001'),
                    ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Biología', 4, 'f0000000-0000-0000-0000-000000000003'),
                    ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
                    ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Historia', 4, 'f0000000-0000-0000-0000-000000000007'),
                    ('a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'Inglés', 4, 'f0000000-0000-0000-0000-000000000008'),
                    # 2° Medio B
                    ('a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
                    ('a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
                    ('a0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000002', 'Química', 4, 'f0000000-0000-0000-0000-000000000003'),
                    ('a0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002', 'Educación Física', 4, 'f0000000-0000-0000-0000-000000000005'),
                    # 5° Básico A
                    ('a0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000005', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
                    ('a0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000005', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
                    ('a0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000005', 'Historia', 4, 'f0000000-0000-0000-0000-000000000007'),
                    ('a0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000005', 'Inglés', 4, 'f0000000-0000-0000-0000-000000000008')
                ]
                for s_id, c_id, name, hrs, p_id in subjects_data:
                    cur.execute("""
                        INSERT INTO course_subjects (id, course_id, subject_name, weekly_hours, professor_id)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (s_id, c_id, name, hrs, p_id))
                
                # 7. Insert Medical Licenses
                print("🏥 Seeding medical licenses...")
                today = datetime.now().date()
                licenses_data = [
                    ('e0000000-0000-0000-0000-000000000001', 'Juan Pérez', '11.111.111-1', 'J11.9', 10, today, today + timedelta(days=9), 'Fonasa', 'pending_replacement', None),
                    ('e0000000-0000-0000-0000-000000000002', 'Carlos Ruiz', '33.333.333-3', 'S82.1', 30, today - timedelta(days=15), today + timedelta(days=14), 'Isapre Banmédica', 'covered', 'f0000000-0000-0000-0000-000000000010'),
                    ('e0000000-0000-0000-0000-000000000003', 'Maria González', '22.222.222-2', 'F43.2', 7, today + timedelta(days=1), today + timedelta(days=7), 'Isapre Colmena', 'pending_replacement', None)
                ]
                for lic_id, prof_name, rut, diag, days, start, end, health, status, rep_id in licenses_data:
                    cur.execute("""
                        INSERT INTO medical_licenses (id, organization_id, user_id, professor_name, professor_rut, diagnosis_code, days_count, start_date, end_date, health_entity, status, replacement_professor_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (lic_id, demo_org_id, demo_admin_id, prof_name, rut, diag, days, start, end, health, status, rep_id))
                
                # 8. Insert Schedule Slots (Timetable for 1° Medio A)
                print("📅 Seeding schedule slots...")
                slots_data = [
                    ('a0000000-0000-0000-0000-000000000001', 1, 1), # Lunes P1
                    ('a0000000-0000-0000-0000-000000000001', 1, 2), # Lunes P2
                    ('a0000000-0000-0000-0000-000000000004', 1, 3), # Lunes P3
                    ('a0000000-0000-0000-0000-000000000004', 1, 4), # Lunes P4
                    
                    ('a0000000-0000-0000-0000-000000000002', 2, 1), # Martes P1
                    ('a0000000-0000-0000-0000-000000000002', 2, 2), # Martes P2
                    ('a0000000-0000-0000-0000-000000000003', 2, 3), # Martes P3
                    ('a0000000-0000-0000-0000-000000000003', 2, 4), # Martes P4
                    
                    ('a0000000-0000-0000-0000-000000000001', 3, 1), # Miércoles P1
                    ('a0000000-0000-0000-0000-000000000001', 3, 2), # Miércoles P2
                    ('a0000000-0000-0000-0000-000000000005', 3, 3), # Miércoles P3
                    ('a0000000-0000-0000-0000-000000000005', 3, 4), # Miércoles P4
                    
                    ('a0000000-0000-0000-0000-000000000004', 4, 1), # Jueves P1
                    ('a0000000-0000-0000-0000-000000000004', 4, 2), # Jueves P2
                    ('a0000000-0000-0000-0000-000000000006', 4, 3), # Jueves P3
                    ('a0000000-0000-0000-0000-000000000006', 4, 4), # Jueves P4
                    
                    ('a0000000-0000-0000-0000-000000000001', 5, 1), # Viernes P1
                    ('a0000000-0000-0000-0000-000000000001', 5, 2)  # Viernes P2
                ]
                
                for subject_id, day, period in slots_data:
                    cur.execute("""
                        INSERT INTO schedule_slots (organization_id, course_id, course_subject_id, day_of_week, period_number)
                        VALUES (%s, 'c0000000-0000-0000-0000-000000000001', %s, %s, %s)
                    """, (demo_org_id, subject_id, day, period))
                
                print("🎉 Rich demo seed data successfully populated in PostgreSQL dev database!")
                
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed_data()
