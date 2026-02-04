import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load .env explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("❌ API Key not found")
    exit(1)

genai.configure(api_key=api_key)

print(f"Listing models for API Key ending in ...{api_key[-4:]}")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")
