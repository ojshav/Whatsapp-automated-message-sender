import os
import csv
import asyncio
import logging
from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Form
import httpx
import uvicorn
import shutil
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
WHATSAPP_API_TOKEN = os.getenv("ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_API_URL = f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
print("WHATSAPP_API_TOKEN:", os.getenv("ACCESS_TOKEN"))
print("WHATSAPP_PHONE_NUMBER_ID:", os.getenv("WHATSAPP_PHONE_NUMBER_ID"))

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Set the delay between messages (in seconds)
MESSAGE_DELAY = 15

# Campaign status tracking
campaign_status = {}

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

async def send_whatsapp_message(phone: str, template_name: str) -> bool:
    """Send a message via WhatsApp Cloud API using template"""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    data = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": "en"
            }
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, headers=headers, json=data)
            if response.status_code == 200:
                logger.info(f"Message sent successfully to {phone} using template {template_name}")
                return True
            else:
                logger.error(f"Failed to send message: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {str(e)}")
        return False

async def process_csv_file_and_send_messages(file_path: str, template_name: str) -> dict:
    """Process contacts from uploaded CSV and send marketing messages"""
    results = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    # Initialize campaign status
    file_name = os.path.basename(file_path)
    campaign_status[file_name] = {
        "status": "processing",
        "processed": 0,
        "total": 0,
        "successful": 0,
        "failed": 0
    }
    
    try:
        if not os.path.exists(file_path):
            logger.error(f"CSV file not found: {file_path}")
            campaign_status[file_name]["status"] = "failed"
            return {"error": f"CSV file not found: {file_path}"}
            
        # First, count total rows
        with open(file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            campaign_status[file_name]["total"] = sum(1 for _ in reader)
            
        # Now process each row
        with open(file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                results["total"] += 1
                
                try:
                    # Extract contact information
                    phone = row['Mobile']
                    company = row['Name of the Exhibitor']
                    
                    # Send template message
                    success = await send_whatsapp_message(
                        phone,
                        template_name
                    )
                    
                    # Record result
                    result_detail = {
                        "phone": phone,
                        "company": company,
                        "success": success,
                        "message": f"Template {template_name} sent" if success else "Failed to send"
                    }
                    
                    # Update counts
                    campaign_status[file_name]["processed"] += 1
                    
                    if success:
                        results["successful"] += 1
                        campaign_status[file_name]["successful"] += 1
                    else:
                        results["failed"] += 1
                        campaign_status[file_name]["failed"] += 1
                        
                    results["details"].append(result_detail)
                    
                    # Add delay between messages to avoid rate limits
                    logger.info(f"Waiting {MESSAGE_DELAY} seconds before sending next message...")
                    await asyncio.sleep(MESSAGE_DELAY)
                    
                except Exception as e:
                    logger.error(f"Error processing contact: {str(e)}")
                    results["failed"] += 1
                    campaign_status[file_name]["failed"] += 1
                    campaign_status[file_name]["processed"] += 1
                    results["details"].append({
                        "phone": row.get('Mobile', 'unknown'),
                        "company": row.get('Name of the Exhibitor', 'unknown'),
                        "success": False,
                        "message": f"Error: {str(e)}"
                    })
        
        # Mark campaign as completed
        campaign_status[file_name]["status"] = "completed"
    
    except Exception as e:
        logger.error(f"Error reading CSV file: {str(e)}")
        campaign_status[file_name]["status"] = "failed"
        return {"error": str(e)}
    
    return results

@app.post("/upload-csv")
async def upload_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...), template_name: str = Form("scalixity_marketing_3")):
    """Upload CSV file and start campaign with specified template"""
    try:
        # Log the template name being used
        logger.info(f"Received request with template_name: {template_name}")
        
        # Create a unique file path
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Start background processing with the provided template name
        background_tasks.add_task(process_csv_file_and_send_messages, file_path, template_name)
        
        return {
            "message": f"CSV file uploaded and campaign started with template {template_name}",
            "filename": file.filename,
            "status": "processing"
        }
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return {"detail": str(e)}

@app.get("/campaign-status/{filename}")
async def get_campaign_status(filename: str):
    """Get the status of a campaign by filename"""
    if filename not in campaign_status:
        return {
            "status": "not_found",
            "message": "Campaign not found"
        }
    
    status_data = campaign_status[filename]
    
    # Calculate success rate if there are processed messages
    success_rate = "0%"
    if status_data["processed"] > 0:
        rate = (status_data["successful"] / status_data["processed"]) * 100
        success_rate = f"{rate:.1f}%"
    
    return {
        "status": status_data["status"],
        "processed": status_data["processed"],
        "total": status_data["total"],
        "successful": status_data["successful"],
        "failed": status_data["failed"],
        "success_rate": success_rate
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)