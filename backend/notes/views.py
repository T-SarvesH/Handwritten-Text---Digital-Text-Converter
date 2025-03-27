import os
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .azure_utils import upload_image_to_blob

@api_view(['POST'])
def upload_and_process_image(request):
    if "image" not in request.FILES:
        return Response({"error": "No image file provided"}, status=400)
    
    image = request.FILES["image"]
    file_name = image.name

    blob_url = upload_image_to_blob(image, file_name)
    
    ocr_text = extract_text_from_image(blob_url)

    return Response({"image_url": blob_url, "extracted_text": ocr_text})

def extract_text_from_image(image_url):
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

    url = f"{endpoint}/formrecognizer/documentModels/prebuilt-layout/analyze?api-version=2024-11-30"
    headers = {"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json"}
    payload = {"urlSource": image_url}
    
    response = requests.post(url, headers=headers, json=payload)
    result = response.json()
    
    if "analyzeResult" in result:
        extracted_text = " ".join([line["content"] for page in result["analyzeResult"]["pages"] for line in page.get("lines", [])])
        return extracted_text
    return "Text extraction failed"
