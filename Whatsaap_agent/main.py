import os
import csv
import asyncio
import logging
from io import StringIO
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain.chains import LLMChain
from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Form, HTTPException
import httpx
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
groq_api_key = os.getenv("GROQ_API_KEY")
WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_API_URL = f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"

# Initialize LLM
llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192",
    temperature=0.7,
    max_tokens=400
)

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Marketing message prompt
MARKETING_PROMPT = """
You are a professional business development representative for Scalixity. Your task is to craft a personalized marketing message to a potential business lead via WhatsApp.

The message should:
1. Be brief and to the point (under 100 words)
2. Start with "Hi, this is Scalixity"
3. Address the company by name
4. Briefly mention how our development services might benefit their company based on their sector
5. Highlight our expertise in software development, website creation, or app development
6. End with a simple question asking for their interest or a quick call

Here's the information about the contact:
- Company: {company}
- Company Profile: {profile}
- Industry/Sector: {sector}

Scalixity provides software development services specializing in custom applications, websites, mobile apps, and digital transformation. We have a track record of helping businesses improve efficiency and grow through technology solutions.

Write a friendly, professional message that doesn't sound automated.
"""

async def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a text message via WhatsApp Cloud API"""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    data = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "text",
        "text": {"body": message}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, headers=headers, json=data)
            if response.status_code == 200:
                logger.info(f"Message sent successfully to {phone}")
                return True
            else:
                logger.error(f"Failed to send message: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {str(e)}")
        return False

async def generate_marketing_message(company: str, profile: str, sector: str) -> str:
    """Generate personalized marketing message"""
    prompt = ChatPromptTemplate.from_messages([
        ("system", MARKETING_PROMPT)
    ])
    
    chain = LLMChain(llm=llm, prompt=prompt)
    
    result = await chain.arun(
        company=company,
        profile=profile,
        sector=sector
    )
    
    return result.strip()

async def process_csv_content_and_send_messages(csv_content: str) -> dict:
    """Process contacts from CSV content and send marketing messages"""
    results = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    try:
        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file)
        
        for row in reader:
            results["total"] += 1
            
            try:
                phone = row['Mobile']
                company = row['Name of the Exhibitor']
                profile = row['Profile']
                sector = row['Sector']
                
                # Generate marketing message
                message = await generate_marketing_message(company, profile, sector)
                
                # Send message
                success = await send_whatsapp_message(phone, message)
                
                # Record result
                result_detail = {
                    "phone": phone,
                    "company": company,
                    "success": success,
                    "message": message if success else "Failed to send"
                }
                
                if success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    
                results["details"].append(result_detail)
                
                # Small delay to avoid rate limits
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error processing contact: {str(e)}")
                results["failed"] += 1
                results["details"].append({
                    "phone": row.get('Mobile', 'unknown'),
                    "company": row.get('Name of the Exhibitor', 'unknown'),
                    "success": False,
                    "message": f"Error: {str(e)}"
                })
    
    except Exception as e:
        logger.error(f"Error processing CSV content: {str(e)}")
        return {"error": str(e)}
    
    return results

@app.post("/upload-csv")
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Endpoint to upload CSV file and process it for marketing messages
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    # Read file content
    csv_content = await file.read()
    
    # Convert bytes to string
    try:
        csv_text = csv_content.decode('utf-8')
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            csv_text = csv_content.decode('latin-1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not decode CSV file: {str(e)}")
    
    # Process CSV in background
    background_tasks.add_task(process_csv_content_and_send_messages, csv_text)
    
    return {
        "message": f"CSV file '{file.filename}' uploaded successfully. Marketing messages will be processed in the background.",
        "status": "processing"
    }

@app.post("/send-marketing-messages-with-file")
async def send_marketing_messages_with_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Combined endpoint for uploading CSV and sending marketing messages"""
    return await upload_csv(background_tasks, file)

@app.post("/send-marketing-messages")
async def send_marketing_messages(background_tasks: BackgroundTasks):
    """Legacy endpoint for backward compatibility - uses fixed CSV file path"""
    CSV_FILE_PATH = "test.csv"
    
    if not os.path.exists(CSV_FILE_PATH):
        return {"error": f"CSV file not found: {CSV_FILE_PATH}"}
    
    with open(CSV_FILE_PATH, 'r') as csvfile:
        csv_content = csvfile.read()
    
    background_tasks.add_task(process_csv_content_and_send_messages, csv_content)
    
    return {
        "message": "Marketing message campaign started using test.csv (Scalixity personalized messages)",
        "status": "processing"
    }

@app.get("/test-auth")
async def test_auth():
    """Test the WhatsApp API authentication"""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}",
                headers=headers
            )
            return {
                "status_code": response.status_code,
                "response": response.json() if response.status_code == 200 else response.text,
                "token_present": bool(WHATSAPP_API_TOKEN),
                "token_length": len(WHATSAPP_API_TOKEN) if WHATSAPP_API_TOKEN else 0
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/campaign-results")
async def get_campaign_results():
    """Get results of the most recent marketing campaign"""
    return {"message": "Result tracking not implemented in this simplified version"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)