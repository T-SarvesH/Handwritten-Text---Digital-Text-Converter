import React from "react";
import UploadImage from "./components/UploadImage";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <div>
      <UploadImage />
      <ToastContainer />
    </div>
  );
}

export default App;
