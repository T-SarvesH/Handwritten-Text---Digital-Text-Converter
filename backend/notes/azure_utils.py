from azure.storage.blob import BlobServiceClient
import os
from django.conf import settings

AZURE_CONNECTION_STRING = settings.AZURE_CONNECTION_STRING
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")

def upload_image_to_blob(image_file, file_name):
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER_NAME, blob=file_name)

        # Upload in chunks if file is large (Fix for OutOfRangeInput)
        blob_client.upload_blob(image_file.read(), overwrite=True, blob_type="BlockBlob")

        return blob_client.url  # Return the URL of the uploaded file
    except Exception as e:
        print(f"Error uploading to Azure Blob: {e}")
        return None
