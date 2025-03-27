import requests
import os
import time

def extract_text_from_image(image_url):
    endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    api_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")
    api_version = os.getenv("AZURE_API_VERSION", "2024-11-30")
    model = os.getenv("AZURE_MODEL", "prebuilt-read")

    url = f"{endpoint}/formrecognizer/documentModels/{model}:analyze?api-version={api_version}"
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/json"
    }
    data = {"urlSource": image_url}

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    operation_url = response.headers["operation-location"]

    # Wait for processing to complete
    while True:
        result = requests.get(operation_url, headers=headers).json()
        if result.get("status") in ["succeeded", "failed"]:
            break
        time.sleep(1)

    if result["status"] == "succeeded":
        text = "\n".join([line["content"] for page in result["analyzeResult"]["pages"] for line in page.get("lines", [])])
        return text

    return None
