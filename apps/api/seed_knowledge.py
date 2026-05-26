import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

# Add the current directory to python path for db import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection

# Load environment variables
load_dotenv()

# Initialize Gemini API
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("❌ Error: GOOGLE_API_KEY is not configured in .env file.")
    sys.exit(1)

genai.configure(api_key=api_key)

def chunk_text(text, chunk_size=500, overlap=100):
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    i = 0
    while i < len(text):
        chunk = text[i:i + chunk_size]
        chunks.append(chunk)
        i += (chunk_size - overlap)
        if i >= len(text) - overlap:
            break
    return chunks

def get_embedding_with_fallback(text):
    models_to_try = [
        "models/text-embedding-004",
        "models/gemini-embedding-001",
        "models/embedding-001"
    ]
    last_error = None
    
    for model_name in models_to_try:
        try:
            print(f"  Trying {model_name}...")
            result = genai.embed_content(
                model=model_name,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=768
            )
            if "embedding" in result:
                return result["embedding"]
        except Exception as e:
            print(f"  Failed {model_name}: {e}")
            last_error = e
            
    raise Exception(f"All embedding models failed. Last error: {last_error}")

def seed_knowledge():
    file_path = os.path.join(os.path.dirname(__file__), "data", "knowledge_scholarflow.txt")
    
    print("📂 Reading Scholar-Flow knowledge base file...")
    if not os.path.exists(file_path):
        print(f"❌ Error: The file {file_path} does not exist.")
        sys.exit(1)
        
    with open(file_path, "r", encoding="utf-8") as f:
        text_content = f.read()
        
    print("✂️  Segmenting manual text into chunks using sliding window...")
    chunks = chunk_text(text_content, 500, 100)
    print(f"📊 Generated {len(chunks)} chunks.\n")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Clear old chunks
                print("🧹 Cleaning old knowledge chunks from PostgreSQL...")
                cur.execute("DELETE FROM knowledge_base_chunks")
                print("🧹 Cleared successfully.")
                
                for idx, chunk in enumerate(chunks):
                    chunk_clean = chunk.strip()
                    if not chunk_clean:
                        continue
                        
                    print(f"🤖 Generating embedding for chunk {idx + 1}/{len(chunks)}...")
                    print(f"📝 Text preview: \"{chunk_clean[:60]}...\"")
                    
                    embedding = get_embedding_with_fallback(chunk_clean)
                    
                    if not embedding or len(embedding) != 768:
                        raise ValueError(f"Expected 768-dimension embedding, got {len(embedding) if embedding else 0}")
                        
                    # Insert into PostgreSQL
                    cur.execute(
                        """
                        INSERT INTO knowledge_base_chunks (document_name, content, embedding)
                        VALUES (%s, %s, %s)
                        """,
                        ("knowledge_scholarflow.txt", chunk_clean, embedding)
                    )
                    
                    print(f"✅ Chunk {idx + 1} written to database.\n")
                    
        print("🎉 Seeding RAG knowledge base completed successfully!")
        
    except Exception as e:
        print(f"❌ Critical error during seeding: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed_knowledge()
