import React, { useState, useEffect,useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import SummaryReport from "./summary_report";


const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [bucket, setBucket] = useState("logo-detection-bucket");
  const [key, setKey] = useState("");
  const [reportUrl, setReport] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [taskCompleted, setTaskCompleted] = useState(false);

  const backendUrl = "http://localhost:5000/";
  const fileInputRef = useRef(null); // Ref for the file input element
  let socket = null;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your process may not be saved.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
      setProgress(0);
      alert("File uploaded successfully! Please click 'Start Task' to begin.");
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
        if (update.taskId === data.taskId) {
          console.log("Progress update:", update);
          setProgress(update.progress);
          if (update.reportUrl) setReport(update.reportUrl);
          if (update.videoUrl) setVideoUrl(update.videoUrl);

          if (update.status === 'Complete' &&update.progress === 100) {
            setTaskCompleted(true);
            setTaskStarted(false);
            socket.disconnect();
            alert("Task completed successfully!");
          }
        }
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });
    } catch (err) {
      console.error("Error starting task:", err);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTaskId(null);
    setProgress(0);
    setUploading(false);
    setTaskStarted(false);
    setBucket("logo-detection-bucket");
    setKey("");
    setReport("");
    setVideoUrl("");
    setTaskCompleted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
  };

  return (
    <div className="container my-5">
      <div style={{textAlign:'center'}}>
        <h1 className="display-4">🎥 Logo Detection App POC</h1>
        <p className="text-muted">Upload your video and detect object seamlessly!</p>
        </div>
      <header className="text-center mb-4">
      </header>

      <div className="card shadow p-4 mb-4">
        <h2 className="h5">Step 1: Upload Your Video</h2>
        <div className="input-group my-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="form-control"
            ref={fileInputRef} // Attach ref to the file input
          />
          <button
            onClick={handleFileUpload}
            className="btn btn-primary"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
        {uploading && (
          <div className="progress">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}
      </div>

      <div className="card shadow p-4 mb-4">
        <h2 className="h5">Step 2: Start Detection Task 
        {taskStarted &&(<p className="text-danger font-weight-bold">
          Warning: Do not refresh or close the page during the process.
        </p> )}
        
        </h2>
        <button
          onClick={handleStartTask}
          className="btn btn-success"
          disabled={uploading || taskStarted || taskCompleted}
        >
          {taskCompleted
            ? "Task Completed"
            : taskStarted
            ? "Task In Progress..."
            : "Start Task"}
        </button>
        {taskStarted && (
          <div className="progress mt-3">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated bg-success"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}
      </div>

   
      <div className="d-flex justify-content-between">
      {taskCompleted && ( <div className="card shadow p-4 mb-4" style={{ flex: 1, marginRight: "20px" }}>
          <h2 className="h5">Detection Report</h2>
          <SummaryReport url={reportUrl} />
        </div>)}

        {videoUrl && (
          <div className="card shadow p-4 mb-4" style={{ flex: 1 }}>
            <h2 className="h5">Processed Video</h2>
            <video controls className="w-100" type="video/mp4" autoPlay src={videoUrl}></video>
          </div>
        )}
      </div>

      <button onClick={handleReset} className="btn btn-secondary mt-3">
        Reset
      </button>
    </div>
  );
};

export default VideoUpload;
