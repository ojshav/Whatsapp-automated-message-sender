import os
import csv
import asyncio
import logging
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain.chains import LLMChain
from fastapi import FastAPI, BackgroundTasks
import httpx
import uvicorn

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

# Define the fixed local CSV file path
CSV_FILE_PATH = "test.csv"

# Initialize LLM
llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192",
    temperature=0.7,
    max_tokens=400
)

# FastAPI app
app = FastAPI()

# Marketing message prompt
MARKETING_PROMPT = """
You are a professional business development representative for our company. Your task is to craft a personalized marketing message to a potential business lead via WhatsApp.

The message should:
1. Be brief and to the point (under 100 words)
2. Address the company by name
3. Briefly mention how our development services might benefit their company based on their sector
4. Highlight our expertise in software development, website creation, or app development
5. End with a simple question asking for their interest or a quick call

Here's the information about the contact:
- Company: {company}
- Company Profile: {profile}
- Industry/Sector: {sector}

Our company provides software development services specializing in custom applications, websites, mobile apps, and digital transformation. We have a track record of helping businesses improve efficiency and grow through technology solutions.

Write a friendly, professional message that doesn't sound automated.
"""

async def send_whatsapp_message(phone: str, message: str, use_template: bool = False, template_name: str = "hello_world") -> bool:
    """Send a message via WhatsApp Cloud API using either template or text message"""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    if use_template:
        # Using template structure as shown in the curl example
        data = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": "en_US"
                }
                # For templates with parameters, you would add them here
                # "components": [
                #    {
                #        "type": "body",
                #        "parameters": [
                #            {"type": "text", "text": message}
                #        ]
                #    }
                # ]
            }
        }
    else:
        # Original text message structure
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

async def process_csv_and_send_messages(use_template: bool = False, template_name: str = "hello_world") -> dict:
    """Process contacts from CSV and send marketing messages"""
    file_path = CSV_FILE_PATH  # Use the fixed file path
    results = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    try:
        if not os.path.exists(file_path):
            logger.error(f"CSV file not found: {file_path}")
            return {"error": f"CSV file not found: {file_path}"}
            
        with open(file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                results["total"] += 1
                
                try:
                    # Extract contact information with updated field names
                    phone = row['Mobile']
                    company = row['Name of the Exhibitor']  # Updated field name
                    profile = row['Profile']                # Updated field name
                    sector = row['Sector']                  # Updated field name
                    
                    # Generate marketing message
                    message = await generate_marketing_message(company, profile, sector)
                    
                    # Send message
                    success = await send_whatsapp_message(
                        phone, 
                        message,
                        use_template=use_template,
                        template_name=template_name
                    )
                    
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
        logger.error(f"Error reading CSV file: {str(e)}")
        return {"error": str(e)}
    
    return results

@app.post("/send-marketing-messages")
async def send_marketing_messages(background_tasks: BackgroundTasks, use_template: bool = False, template_name: str = "hello_world"):
    """API endpoint to load contacts from CSV and send marketing messages"""
    background_tasks.add_task(process_csv_and_send_messages, use_template, template_name)
    message_type = "template" if use_template else "text"
    return {
        "message": f"Marketing message campaign started using test.csv (using {message_type} messages)",
        "status": "processing",
        "template": template_name if use_template else None
    }

@app.post("/send-template-messages")
async def send_template_messages(background_tasks: BackgroundTasks, template_name: str = "hello_world"):
    """API endpoint specifically for template-based messages"""
    background_tasks.add_task(process_csv_and_send_messages, True, template_name)
    return {
        "message": f"Template-based marketing campaign started using {template_name} template",
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
            # Simple API call to verify auth
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
    # This is a placeholder - you would need to implement result storage
    return {"message": "Result tracking not implemented in this simplified version"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)