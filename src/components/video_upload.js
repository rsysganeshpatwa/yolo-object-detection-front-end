import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client"; // Import socket.io-client
import "../App.css"; // Import custom CSS

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [bucket, setBucket] = useState("logo-detection-bucket");
  const [key, setKey] = useState(
    "uploads/80f4c2f8-b06e-4fd6-aec2-e21cb85caf25_icici-story_demo.mp4"
  );
  const backendUrl = "http://localhost:5000/";
  let socket = null; // Declare socket to connect only once

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const { data } = await axios.post(`${backendUrl}/get-presigned-url`, {
        fileName: file.name,
      });

      setBucket(data.bucket);
      setKey(data.key);

      await axios.put(data.url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setProgress(percentage);
        },
      });

      setUploading(false);
    } catch (err) {
      console.error("Error during file upload:", err);
      setUploading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      if (!bucket || !key) {
        alert("Please upload a file first.");
        return;
      }

     // Notify the backend to start processing after the file is uploaded
     const { data } = await axios.post(`${backendUrl}/start-task`, {
      bucket: bucket,
      key: key,
    });
      setTaskId(data.taskId);
      setTaskStarted(true);

      if (!socket) {
        socket = io("http://localhost:5000");
      }

     socket.emit("task", { taskId: data.taskId, bucket, key });

      socket.on("connect", () => {
        console.log("WebSocket connected");
      });

      socket.on("progress", (update) => {
        console.log("Progress update:", update);
        if (update.taskId === data.taskId) {
          setProgress(update.progress);
        }
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });
    } catch (err) {
      console.error("Error starting task:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>🎥 Logo Detection App POC</h1>
      </header>

      <div className="upload-section">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input"
        />
        <button
          onClick={handleFileUpload}
          className="upload-btn"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
        {uploading && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>

      <div className="task-section">
        <button
          onClick={handleStartTask}
          className="task-btn"
          disabled={uploading || taskStarted}
        >
          {taskStarted ? "Task Started" : "Start Task"}
        </button>
        {taskStarted && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
