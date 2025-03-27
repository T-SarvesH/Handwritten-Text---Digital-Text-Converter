import os
import requests
import time
import base64
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .azure_utils import upload_image_to_blob  # Ensure this function exists

@api_view(['POST'])
def upload_and_process_image(request):
    """Handles image upload, converts it to Base64, and processes it for OCR."""
    print("🟢 Received a new image upload request!")

    # Check if an image file is provided
    if "image" not in request.FILES:
        print("🔴 Error: No image file provided in request.")
        return Response({"error": "No image file provided"}, status=400)

    image = request.FILES["image"]
    file_name = image.name
    print(f"🟡 Processing image: {file_name} ({image.size} bytes)")

    try:
        # Upload image to Azure Blob Storage and get URL
        blob_url = upload_image_to_blob(image, file_name)
        print(f"✅ Image uploaded successfully to: {blob_url}")

        # Convert image to Base64 in parallel
        image.seek(0)  # Reset file pointer before reading again
        base64_image = base64.b64encode(image.read()).decode('utf-8')
        print("✅ Image converted to Base64 successfully.")

        # Extract text using Azure Document Intelligence API
        extracted_text = extract_text_from_image(base64_image)
        print(f"✅ OCR extraction completed. Extracted Text:\n{extracted_text}\n")

        return Response({"image_url": blob_url, "extracted_text": extracted_text})

    except Exception as e:
        print(f"🔴 Error processing image: {e}")
        return Response({"error": "OCR processing failed"}, status=500)


def extract_text_from_image(base64_image):
    """Extracts text from an image using Azure Document Intelligence API."""
    print("🟢 Starting OCR processing using Base64...")

    # Load Azure credentials from environment variables
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

    if not endpoint or not key:
        print("🔴 Missing Azure API credentials!")
        return "Error: Missing Azure credentials"

    # Construct the correct API URL
    url = f"{endpoint.rstrip('/')}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31"
    headers = {"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json"}
    payload = {"base64Source": base64_image}  # Sending Base64 instead of URL

    print("🟡 Sending Base64 image to Azure Document Intelligence API...")

    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"🟡 Azure API Response Status: {response.status_code}")

        if response.status_code == 202:
            operation_url = response.headers.get("Operation-Location")
            if not operation_url:
                print("🔴 Error: Operation-Location header missing in response.")
                return "Error: Invalid Azure API response"

            return poll_for_result(operation_url, headers)
        
        try:
            error_msg = response.json()
        except ValueError:
            error_msg = "Unknown error (non-JSON response)"
        print(f"🔴 API Error: {error_msg}")
        return "Error: Azure API request failed"

    except requests.exceptions.RequestException as e:
        print(f"🔴 Request to Azure API failed: {e}")
        return "Error: Unable to connect to Azure API"


def poll_for_result(operation_url, headers):
    """Polls Azure API for the OCR result until processing is complete."""
    print("🟡 Waiting for Azure to process the document...")

    for attempt in range(20):  # Retry for ~60 seconds
        time.sleep(min(2**attempt, 15))  # Exponential backoff (max 15s)
        response = requests.get(operation_url, headers=headers)
        result = response.json()

        if response.status_code == 200 and result.get("status") == "succeeded":
            print("✅ Azure Document Intelligence processing completed.")
            return extract_text_from_result(result)

        elif result.get("status") == "failed":
            print("🔴 Azure OCR processing failed.")
            return "Error: OCR processing failed"

    print("🔴 Timed out waiting for Azure OCR processing.")
    return "Error: Azure OCR took too long to process."


def extract_text_from_result(result):
    """Extracts text content from the OCR result."""
    print("🟢 Extracting text content from Azure OCR result...")

    if "analyzeResult" in result:
        extracted_text = " ".join(
            [line["content"] for page in result["analyzeResult"]["pages"] for line in page.get("lines", [])]
        )
        print(f"✅ Extracted Text (First 200 chars): {extracted_text[:200]}...")  # Preview text
        return extracted_text

    print("🔴 Text extraction failed. No 'analyzeResult' in response.")
    return "Text extraction failed"
