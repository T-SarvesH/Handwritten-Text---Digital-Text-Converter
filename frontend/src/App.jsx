import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/test/")
      .then((response) => setData(response.data.message))
      .catch((error) => console.error("Error:", error));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600">Vite + React + Django</h1>
      <p className="mt-4 text-lg">{data ? data : "Loading..."}</p>
    </div>
  );
}

export default App;
