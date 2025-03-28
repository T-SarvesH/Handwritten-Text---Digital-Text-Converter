import os
import requests
import time
import base64
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .azure_utils import upload_image_to_blob

@api_view(['POST'])
def upload_and_process_image(request):
    """Handles image upload, converts it to Base64, and processes it for OCR."""

    if "image" not in request.FILES:
        return Response({"error": "No image file provided"}, status=400)

    image = request.FILES["image"]
    file_name = image.name

    try:
        blob_url = upload_image_to_blob(image, file_name)

        image.seek(0)
        base64_image = base64.b64encode(image.read()).decode('utf-8')

        extracted_text = extract_text_from_image(base64_image)

        return Response({"image_url": blob_url, "extracted_text": extracted_text})

    except Exception as e:
        return Response({"error": "OCR processing failed"}, status=500)


def extract_text_from_image(base64_image):
    """Extracts text from an image using Azure Document Intelligence API."""

    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

    if not endpoint or not key:
        return "Error: Missing Azure credentials"

    url = f"{endpoint.rstrip('/')}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31"
    headers = {"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json"}
    payload = {"base64Source": base64_image}

    try:
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 202:
            operation_url = response.headers.get("Operation-Location")
            if not operation_url:
                return "Error: Invalid Azure API response"

            return poll_for_result(operation_url, headers)

        return "Error: Azure API request failed"

    except requests.exceptions.RequestException:
        return "Error: Unable to connect to Azure API"


def poll_for_result(operation_url, headers):
    """Polls Azure API for the OCR result until processing is complete."""

    for attempt in range(20):
        time.sleep(min(2**attempt, 15))
        response = requests.get(operation_url, headers=headers)
        result = response.json()

        if response.status_code == 200 and result.get("status") == "succeeded":
            return extract_text_from_result(result)

        if result.get("status") == "failed":
            return "Error: OCR processing failed"

    return "Error: Azure OCR took too long to process"


def extract_text_from_result(result):
    """Extracts text content from the OCR result."""

    if "analyzeResult" in result:
        extracted_text = " ".join([
            line["content"] for page in result["analyzeResult"]["pages"] for line in page.get("lines", [])
        ])
        return extracted_text

    return "Text extraction failed"
