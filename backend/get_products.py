import json
import csv
import urllib.request
import time
import re

# Configuration
BASE_URL = "https://www.homesake.in/collections/hanging-lamps-pendants/products.json"
OUTPUT_FILE = "homesake_import_ready.csv"

# Shopify CSV Headers (The specific columns Shopify looks for)
HEADERS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty",
    "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price",
    "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card", "SEO Title", "SEO Description"
]

def clean_html(raw_html):
    """Optional: Basic cleanup of descriptions if needed."""
    if not raw_html: return ""
    return raw_html

def get_products():
    all_products = []
    page = 1
    
    while True:
        url = f"{BASE_URL}?limit=250&page={page}"
        print(f"Fetching page {page}...")
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                products = data.get("products", [])
                
                if not products:
                    break
                    
                all_products.extend(products)
                page += 1
                time.sleep(1) # Be polite to the server
        except Exception as e:
            print(f"Error fetching data: {e}")
            break
            
    return all_products

def process_to_csv(products):
    rows = []
    
    for p in products:
        handle = p['handle']
        title = p['title']
        body = clean_html(p['body_html'])
        vendor = p['vendor']
        p_type = p['product_type']
        tags = ", ".join(p['tags'])
        published = "TRUE"
        
        # Get Options (Size, Color, etc.)
        options = p.get('options', [])
        opt1_name = options[0]['name'] if len(options) > 0 else "Title"
        opt2_name = options[1]['name'] if len(options) > 1 else ""
        opt3_name = options[2]['name'] if len(options) > 2 else ""

        # Get Variants and Images
        variants = p.get('variants', [])
        images = p.get('images', [])
        
        # Determine how many rows we need (max of variants or images)
        max_rows = max(len(variants), len(images))
        
        for i in range(max_rows):
            row = {col: "" for col in HEADERS}
            
            # Fill Handle (Required for all rows to group them)
            row["Handle"] = handle
            
            # Fill Product Data (Only needed on the first row of the product)
            if i == 0:
                row["Title"] = title
                row["Body (HTML)"] = body
                row["Vendor"] = vendor
                row["Type"] = p_type
                row["Tags"] = tags
                row["Published"] = published
                row["Option1 Name"] = opt1_name
                row["Option2 Name"] = opt2_name
                row["Option3 Name"] = opt3_name

            # Fill Variant Data (If a variant exists for this index)
            if i < len(variants):
                v = variants[i]
                row["Option1 Value"] = v.get('option1', '')
                row["Option2 Value"] = v.get('option2', '')
                row["Option3 Value"] = v.get('option3', '')
                row["Variant SKU"] = v.get('sku', '')
                row["Variant Grams"] = v.get('grams', 0)
                row["Variant Inventory Tracker"] = "shopify"
                row["Variant Inventory Qty"] = 0 # Default to 0 to avoid safety issues
                row["Variant Inventory Policy"] = "deny"
                row["Variant Fulfillment Service"] = "manual"
                row["Variant Price"] = v.get('price', 0)
                row["Variant Compare At Price"] = v.get('compare_at_price', '')
                row["Variant Requires Shipping"] = "TRUE"
                row["Variant Taxable"] = "TRUE"
            
            # Fill Image Data (If an image exists for this index)
            if i < len(images):
                img = images[i]
                row["Image Src"] = img.get('src', '')
                row["Image Position"] = i + 1
                row["Image Alt Text"] = title # Use title as fallback alt text

            rows.append(row)

    # Write to CSV
    print(f"Writing {len(rows)} rows to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    print("Done! You can now import this file into Shopify.")

if __name__ == "__main__":
    products = get_products()
    print(f"Found {len(products)} products.")
    process_to_csv(products)