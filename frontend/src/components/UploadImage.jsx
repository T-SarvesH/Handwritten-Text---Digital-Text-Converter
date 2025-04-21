import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./UploadImage.css";
import { jsPDF } from "jspdf";
import Typo from "typo-js";

const UploadImage = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [convertedText, setConvertedText] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [correctedText, setCorrectedText] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState(""); // New state for search query
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

    const correctSpelling = (text) => {
        if (!dictionary) return text;
      
        const words = text.split(" ");
        const correctedWords = words.map((word) => {
          if (!dictionary.check(word)) {
            const suggestions = dictionary.suggest(word);
            return suggestions.length > 0 ? suggestions[0] : word;
          }
          return word;
        });
      
        return correctedWords.join(" ");
      };
      

      useEffect(() => {
        if (convertedText) {
          const corrected = correctSpelling(convertedText);
          setCorrectedText(corrected);
        }
      }, [convertedText]);
      
    // Function to highlight text
    const highlightText = (text, searchQuery) => {
        if (!searchQuery) return text; // If no search query, return text as is
        const regex = new RegExp(`(${searchQuery})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
    };

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
    const [dictionary, setDictionary] = useState(null);

    useEffect(() => {
      const loadDictionary = async () => {
        const affRes = await fetch("/dictionaries/en_US.aff");
        const dicRes = await fetch("/dictionaries/en_US.dic");
    
        const affText = await affRes.text();
        const dicText = await dicRes.text();
    
        const newDict = new Typo("en_US", affText, dicText, { platform: "any" });
        setDictionary(newDict);
      };
    
      loadDictionary();
    }, []);
    
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };
    const handleCopyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(displayedText); // replace with your actual variable
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy: ", err);
        }
      };
      
      const downloadTextFile = () => {
        console.log("Text to download:", convertedText);  // Log the text
        if (!convertedText) {
            alert("No text to download.");
            return;
        }
        
    
        const blob = new Blob([convertedText], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "converted-notes.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const downloadPDF = () => {
        console.log("Converted Text:", convertedText);
      
        if (!convertedText) {
          alert("No text to download.");
          return;
        }
      
        const doc = new jsPDF();
      
        // Split the text into lines that fit within the PDF page
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - margin * 2;
        const lines = doc.splitTextToSize(convertedText, maxLineWidth);
      
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(lines, margin, 20); // Start at x=10, y=20
      
        doc.save("converted-notes.pdf");
      };
      

    

    return (
        <div className="ocr-container">
            <h1 className="main-heading">Handwritten Text to Digital Notes Converter</h1>

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
  <div className="search-bar">
    <input
      type="text"
      placeholder="Search text..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
  

  <div
    className="output-textarea rendered-text"
    dangerouslySetInnerHTML={{ __html: highlightText(displayedText, searchQuery) }}
  ></div>

 {displayedText && (
                                <>
                                    <button className="copy-btn" onClick={handleCopyToClipboard}>
                                        {isCopied ? "Copied!" : "Copy to Clipboard"}
                                    </button>
                                    <button className="download-btn" onClick={downloadTextFile}>
                                        Download as .txt
                                    </button>
                                    <button className="download-btn" onClick={downloadPDF}>
                                        Download as PDF
                                    </button>
                                </>
                            )}
                            
</div>



                    )}
                    
                </div>
                 <div className="corrected-text-container">
  <h3>Corrected Text:</h3>
  <div className="output-textarea rendered-text">
    {correctedText}
  </div>
</div>
                
            </div>
            
        </div>
        
    );
};

export default UploadImage;

/*import React, { useState, useEffect, useRef } from "react";
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
                {/* Image Preview Section }*/
                /*
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

                {/* Text Output Section }*//*
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
*/
