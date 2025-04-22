import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
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
    // textareaRef removed as it's not used in active code

    const [dictionary, setDictionary] = useState(null);

    // Load dictionary once on mount
    useEffect(() => {
      const loadDictionary = async () => {
        try {
          const affRes = await fetch("/dictionaries/en_US.aff");
          const dicRes = await fetch("/dictionaries/en_US.dic");

          if (!affRes.ok || !dicRes.ok) {
            console.error("Failed to fetch dictionary files.");
            // Handle error, maybe set dictionary to null or a dummy object
            return;
          }

          const affText = await affRes.text();
          const dicText = await dicRes.text();

          // Typo-js might throw an error if files are malformed
          const newDict = new Typo("en_US", affText, dicText, { platform: "any" });
          setDictionary(newDict);

        } catch (error) {
          console.error("Error loading dictionary:", error);
          // Handle error loading dictionary
        }
      };

      loadDictionary();
    }, []); // Empty dependency array means this runs once on mount


    // Correct spelling function wrapped in useCallback
    const correctSpelling = useCallback((text) => {
        // Check if dictionary is loaded before using it
        if (!dictionary) {
             console.warn("Dictionary not loaded for spelling correction.");
             return text; // Return original text if dictionary is not ready
        }

        const words = text.split(/\s+/); // Split by one or more whitespace characters
        const correctedWords = words.map((word) => {
          // Remove punctuation before checking/suggesting, re-add later if needed
          const cleanedWord = word.replace(/[.,!?;:]+$/, ''); // Example: remove trailing punctuation
          const punctuation = word.match(/[.,!?;:]+$/) ? word.match(/[.,!?;:]+$/)[0] : ''; // Corrected regex match logic

          if (cleanedWord && !dictionary.check(cleanedWord)) {
            const suggestions = dictionary.suggest(cleanedWord);
            // Append original punctuation back
            return suggestions.length > 0 ? suggestions[0] + punctuation : word;
          }
          return word; // Return original word if correct or no suggestions
        });

        return correctedWords.join(" ");
      }, [dictionary]); // Dependency array for useCallback: correctSpelling depends on dictionary


    // Effect to apply spelling correction when convertedText changes
      useEffect(() => {
        if (convertedText) {
          const corrected = correctSpelling(convertedText);
          setCorrectedText(corrected);
        } else {
            setCorrectedText(""); // Clear corrected text if convertedText is empty
        }
      }, [convertedText, correctSpelling]); // Dependency array for useEffect: includes convertedText and the stable correctSpelling


    // Effect for typing animation
    useEffect(() => {
        let timer;
        if (convertedText) {
            let index = 0;
            setDisplayedText(""); // Clear previous text before animation
            timer = setInterval(() => {
                if (index < convertedText.length) {
                    setDisplayedText(prev => prev + convertedText[index]);
                    index++;
                } else {
                    clearInterval(timer);
                }
            }, 20);
        } else {
             setDisplayedText(""); // Clear displayed text if convertedText is empty
        }
        return () => clearInterval(timer); // Cleanup timer on component unmount or convertedText change
    }, [convertedText]); // Dependency array includes convertedText

    // Function to highlight text
    const highlightText = (text, searchQuery) => {
        if (!searchQuery) return text; // If no search query, return text as is
        // Use a more robust regex to match whole words or handle boundaries if needed
        const regex = new RegExp(`(${searchQuery})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedImage(file);
        setConvertedText("");
        setDisplayedText("");
        setCorrectedText(""); // Clear corrected text on new file selection
        setIsCopied(false);
    };

    // !!! IMPORTANT: Use the apiUrl variable obtained from import.meta.env.VITE_API_URL !!!
    // For local development, VITE_API_URL should be set in a local .env file (e.g., http://127.0.0.1:8000)
    // For Azure deployment, VITE_API_URL should be set in the Azure SWA Environment Variables
    //const apiUrl = import.meta.env.VITE_API_URL; // Correctly access the environment variable

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
        setCorrectedText(""); // Clear previous results on new upload
        setIsCopied(false);

        const uploadUrl = `http://127.0.0.1:8000/api/upload/`; // Construct the full API endpoint URL

        if (!uploadUrl) {
             console.error("API URL is not defined. VITE_API_URL environment variable not set.");
             alert("Application is not configured with an API URL.");
             setIsLoading(false);
             return;
        }

        try {
            const response = await axios.post(uploadUrl, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setConvertedText(response.data.extracted_text);
        } catch (error) {
            console.error("Error uploading image:", error);
            console.error("Attempted to post to URL:", uploadUrl); // Log the URL for debugging
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // handleSearchChange function (used in the search input's onChange)
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleCopyToClipboard = async () => {
        try {
          // Use displayedText or correctedText depending on what you want to copy
          await navigator.clipboard.writeText(displayedText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy: ", err);
          // Handle potential issues like not being in a secure context (https)
          alert("Failed to copy text. Please try manually.");
        }
      };

      const downloadTextFile = () => {
        // Decide whether to download convertedText or correctedText
        const textToDownload = correctedText || convertedText; // Prioritize corrected if available
        console.log("Text to download:", textToDownload);

        if (!textToDownload) {
            alert("No text to download.");
            return;
        }

        const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "converted-notes.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Clean up the object URL
    };

    const downloadPDF = () => {
        // Decide whether to download convertedText or correctedText
        const textToDownload = correctedText || convertedText; // Prioritize corrected if available
        console.log("Text to download for PDF:", textToDownload);

        if (!textToDownload) {
          alert("No text to download.");
          return;
        }

        const doc = new jsPDF();

        // Split the text into lines that fit within the PDF page
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - margin * 2;
        // Ensure correct font and size are set before splitting text
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);

        const lines = doc.splitTextToSize(textToDownload, maxLineWidth, {fontSize: 12});

        // Add text to the PDF, handling potential multiple pages
        let y = 20; // Starting y position
        const lineHeight = 1.2; // Adjust based on font size
        const pageHeight = doc.internal.pageSize.getHeight();

        lines.forEach(line => {
            if (y + lineHeight * 12 > pageHeight - margin) { // Check if line will go off page
                doc.addPage();
                y = margin; // Reset y for new page
            }
            doc.text(line, margin, y);
            y += lineHeight * 12; // Move y down for the next line
        });


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
                              onChange={handleSearchChange} // Use the defined function here
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

// Commented out original code block
/* import React, { useState, useEffect, useRef } from "react";
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
                    {isLoading ? */