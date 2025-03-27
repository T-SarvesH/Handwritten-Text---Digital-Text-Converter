import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "/home/sarvesh/Handwritten-Text---Digital-Text-Converter/frontend/src/styles/styles.css";

const UploadImage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [extractedText, setExtractedText] = useState("");

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image file");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData);
      setImageUrl(response.data.image_url);
      setExtractedText(response.data.extracted_text);
      toast.success("Image uploaded and text extracted!");
    } catch (error) {
      toast.error("Upload failed! Try again.");
    }
  };

  return (
    <div className="container">
      <h2>Upload an Image for OCR</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button className="upload-btn" onClick={handleUpload}>Upload</button>

      {imageUrl && <img src={imageUrl} alt="Uploaded" className="image-preview" />}
      {extractedText && <div className="text-box">{extractedText}</div>}
    </div>
  );
};

export default UploadImage;
