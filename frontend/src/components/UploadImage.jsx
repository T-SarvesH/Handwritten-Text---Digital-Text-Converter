import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./UploadImage.css";

const UploadImage = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [convertedText, setConvertedText] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        let timer;
        if (convertedText) {
            let index = 0;
            timer = setInterval(() => {
                if (index < convertedText.length) {
                    setDisplayedText(prev => prev + convertedText[index]);
                    index++;
                } else {
                    clearInterval(timer);
                }
            }, 20);
        }
        return () => clearInterval(timer);
    }, [convertedText]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedImage(file);
        setConvertedText("");
        setDisplayedText("");
        setIsCopied(false);
    };

    const handleUpload = async () => {
        if (!selectedImage) {
            alert("Please select an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("image", selectedImage);

        setIsLoading(true);
        setConvertedText("");
        setDisplayedText("");
        setIsCopied(false);

        try {
            const response = await axios.post("http://127.0.0.1:8000/api/upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setConvertedText(response.data.extracted_text);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (textareaRef.current) {
            textareaRef.current.select();
            document.execCommand('copy');
            setIsCopied(true);
            
            // Reset copied state after 2 seconds
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="ocr-container">
            <div className="upload-section">
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="file-input"
                />
                <button 
                    className="upload-btn" 
                    onClick={handleUpload}
                    disabled={isLoading}
                >
                    {isLoading ? "Processing..." : "Upload Image"}
                </button>
            </div>

            <div className="content-wrapper">
                {/* Image Preview Section */}
                <div className="image-preview">
                    {selectedImage ? (
                        <img 
                            src={URL.createObjectURL(selectedImage)} 
                            alt="Uploaded" 
                            className="preview-image"
                        />
                    ) : (
                        <div className="placeholder-text">
                            No image selected
                        </div>
                    )}
                </div>

                {/* Text Output Section */}
                <div className="text-output">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="textarea-container">
                            <textarea 
                                ref={textareaRef}
                                value={displayedText} 
                                readOnly 
                                placeholder="Converted text will appear here..."
                                className="output-textarea"
                            />
                            {displayedText && (
                                <button 
                                    className="copy-btn" 
                                    onClick={handleCopyToClipboard}
                                >
                                    {isCopied ? "Copied!" : "Copy to Clipboard"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadImage;