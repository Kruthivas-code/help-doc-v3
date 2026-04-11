#!/usr/bin/env python3
"""
Generate sitemap.xml for SEO
Run this script after adding/updating documents
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
from xml.etree.ElementTree import Element, SubElement, tostring

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
base_url = os.environ.get('SITE_URL', 'https://help.emergent.sh')

async def generate_sitemap():
    """Generate sitemap.xml from database"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Get the default project
        project = await db.projects.find_one({"is_default": True}, {"_id": 0})
        if not project:
            project = await db.projects.find_one({}, {"_id": 0})
        
        if not project:
            print("No project found")
            return
        
        # Get all documents
        documents = await db.documents.find(
            {"project_id": project["id"]},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(1000)
        
        # Build sitemap XML
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        # Add homepage
        url_elem = SubElement(urlset, 'url')
        SubElement(url_elem, 'loc').text = base_url + '/'
        SubElement(url_elem, 'changefreq').text = 'daily'
        SubElement(url_elem, 'priority').text = '1.0'
        
        # Add each document
        for doc in documents:
            url_elem = SubElement(urlset, 'url')
            SubElement(url_elem, 'loc').text = f"{base_url}/{doc['slug']}"
            
            if doc.get('updated_at'):
                updated = doc['updated_at']
                if isinstance(updated, str):
                    lastmod_date = updated.split('T')[0]
                else:
                    lastmod_date = updated.strftime('%Y-%m-%d')
                SubElement(url_elem, 'lastmod').text = lastmod_date
            
            SubElement(url_elem, 'changefreq').text = 'weekly'
            SubElement(url_elem, 'priority').text = '0.8'
        
        # Convert to string
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_str += tostring(urlset, encoding='unicode')
        
        # Write to frontend public folder
        output_path = Path(__file__).parent.parent / 'frontend' / 'public' / 'sitemap.xml'
        with open(output_path, 'w') as f:
            f.write(xml_str)
        
        print(f"✓ Generated sitemap.xml with {len(documents)} documents")
        print(f"  Saved to: {output_path}")
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(generate_sitemap())
