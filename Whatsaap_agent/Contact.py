import os
import csv
import json
import requests
from dotenv import load_dotenv
import argparse
import time
import logging
from typing import List, Dict, Any

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("whatsapp_upload.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

class WhatsAppCloudAPI:
    def __init__(self):
        self.access_token = os.getenv('WHATSAPP_API_TOKEN')
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        self.base_url = f"https://graph.facebook.com/v22.0/{self.phone_number_id}"
        
        if not self.access_token or not self.phone_number_id:
            raise ValueError("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set in the .env file")
    
    def _make_api_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Dict:
        """Make an API request to the WhatsApp Cloud API"""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            raise

    def upload_contact(self, contact_data: Dict) -> Dict:
        """Upload a single contact to WhatsApp Business Account"""
        endpoint = "contacts"
        
        # Format the data according to WhatsApp Cloud API requirements
        data = {
            "contacts": [contact_data],
        }
        
        return self._make_api_request(endpoint, method='POST', data=data)
    
    def batch_upload_contacts(self, contacts: List[Dict]) -> List[Dict]:
        """Upload multiple contacts with rate limiting"""
        results = []
        
        for i, contact in enumerate(contacts):
            try:
                logger.info(f"Uploading contact {i+1}/{len(contacts)}: {contact.get('name', {}).get('first_name')}")
                result = self.upload_contact(contact)
                results.append(result)
                
                # Pause to respect rate limits (typically 50-60 requests per minute for WhatsApp API)
                if (i + 1) % 45 == 0 and i < len(contacts) - 1:
                    logger.info("Rate limit pause: waiting 60 seconds...")
                    time.sleep(60)
                else:
                    # Small pause between regular requests
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Failed to upload contact {contact}: {str(e)}")
                results.append({"error": str(e), "contact": contact})
        
        return results

def parse_csv_to_contacts(csv_file_path: str) -> List[Dict]:
    """Parse CSV file with 'Contact Person' and 'Mobile' columns into contact dictionaries for WhatsApp API"""
    contacts = []
    
    try:
        with open(csv_file_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            # Check if the required columns exist
            if not set(['Contact Person', 'Mobile']).issubset(set(reader.fieldnames)):
                raise ValueError("CSV must contain 'Contact Person' and 'Mobile' columns")
            
            for row in reader:
                # Skip empty rows
                if not row['Mobile'] or not row['Contact Person']:
                    continue
                
                # Format phone number (ensure it includes country code)
                phone = row['Mobile'].strip()
                if not phone.startswith('+'):
                    phone = '+' + phone
                
                # Split full name into first and last name (if possible)
                full_name = row['Contact Person'].strip()
                name_parts = full_name.split(' ', 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ''
                
                contact = {
                    "name": {
                        "first_name": first_name,
                        "last_name": last_name
                    },
                    "phones": [
                        {
                            "phone": phone,
                            "type": "MOBILE"
                        }
                    ]
                }
                
                # Clean up empty fields
                for key in list(contact["name"].keys()):
                    if not contact["name"][key]:
                        del contact["name"][key]
                
                contacts.append(contact)
    
    except FileNotFoundError:
        logger.error(f"CSV file not found: {csv_file_path}")
        raise
    except Exception as e:
        logger.error(f"Error parsing CSV: {str(e)}")
        raise
    
    return contacts

def main():
    parser = argparse.ArgumentParser(description='Upload contacts from CSV to WhatsApp Business Account')
    parser.add_argument('csv_file', help='Path to the CSV file containing contacts')
    parser.add_argument('--dry-run', action='store_true', help='Perform a dry run without uploading contacts')
    parser.add_argument('--output', help='Path to save results JSON')
    args = parser.parse_args()
    
    try:
        # Parse CSV file
        logger.info(f"Parsing contacts from {args.csv_file}")
        contacts = parse_csv_to_contacts(args.csv_file)
        logger.info(f"Found {len(contacts)} valid contacts")
        
        # Display sample of parsed data
        if contacts:
            logger.info(f"Sample contact: {json.dumps(contacts[0], indent=2)}")
        
        if args.dry_run:
            logger.info("DRY RUN: No contacts will be uploaded")
            results = contacts
        else:
            # Initialize WhatsApp API client
            whatsapp_api = WhatsAppCloudAPI()
            
            # Upload contacts
            logger.info(f"Starting upload of {len(contacts)} contacts")
            results = whatsapp_api.batch_upload_contacts(contacts)
            logger.info("Contact upload completed")
        
        # Save results if output path specified
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results saved to {args.output}")
            
        return results
            
    except Exception as e:
        logger.error(f"Error in main execution: {str(e)}")
        raise

if __name__ == "__main__":
    main()