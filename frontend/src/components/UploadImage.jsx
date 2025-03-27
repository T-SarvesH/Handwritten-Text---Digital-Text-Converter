import React, { useState } from "react";
import axios from "axios";
import "/home/sarvesh/Handwritten-Text---Digital-Text-Converter/frontend/src/styles/UploadImage.css";

const UploadImage = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [convertedText, setConvertedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedImage(file);
    };

    const handleUpload = async () => {
        if (!selectedImage) {
            alert("Please select an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("image", selectedImage);

        setIsLoading(true);

        try {
            const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setConvertedText(response.data.text);
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>Upload an Image for OCR</h2>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button className="upload-btn" onClick={handleUpload}>Upload</button>

            <div className="content">
                {/* Left Side: Image Preview */}
                <div className="image-preview">
                    {selectedImage && <img src={URL.createObjectURL(selectedImage)} alt="Uploaded" />}
                </div>

                {/* Middle: Loading Animation */}
                <div className="animation">
                    {isLoading && <div className="spinner"></div>}
                </div>

                {/* Right Side: Converted Text */}
                <div className="text-output">
                    <textarea value={convertedText} readOnly placeholder="Converted text will appear here..." />
                </div>
            </div>
        </div>
    );
};

export default UploadImage;
