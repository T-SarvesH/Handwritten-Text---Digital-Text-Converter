from django.urls import path
from .views import upload_and_process_image

urlpatterns = [
    path("upload/", upload_and_process_image, name="upload-image"),
]
