import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";


const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [bucket, setBucket] = useState("logo-detection-bucket");
  const [key, setKey] = useState("");
  const [report, setReport] = useState([]);
  const [videoUrl, setVideoUrl] = useState("https://logo-detection-bucket.s3.eu-north-1.amazonaws.com/d8edfa95-8395-4df3-a1cc-3e2c394bbd3b/output/processed_video.mp4?response-content-type=video%2Fmp4&response-content-disposition=inline&AWSAccessKeyId=AKIASL7UKNJHPQRU4PO5&Signature=oWmE8vSgJ9ald4vh%2FHTewnIl69g%3D&Expires=1736438420");

  const backendUrl = "http://localhost:5000/";
  let socket = null;

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
      console.log("Presigned URL:", file.type);
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
          if (update.report) setReport(update.reportUrl);
          if (update.videoUrl) setVideoUrl(update.videoUrl);
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
    <div className="container my-5">
      <header className="text-center mb-4">
        <h1 className="display-4">🎥 Logo Detection App POC</h1>
        <p className="text-muted">Upload your video and detect logos seamlessly!</p>
      </header>

      <div className="card shadow p-4 mb-4">
        <h2 className="h5">Step 1: Upload Your Video</h2>
        <div className="input-group my-3">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="form-control"
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
        <h2 className="h5">Step 2: Start Detection Task</h2>
        <button
          onClick={handleStartTask}
          className="btn btn-success"
          disabled={uploading || taskStarted}
        >
          {taskStarted ? "Task Started" : "Start Task"}
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

      {report.length > 0 && (
        <div className="card shadow p-4 mb-4">
          <h2 className="h5">Detection Report</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Logo Name</th>
                <th>Confidence</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {report.map((item, index) => (
                <tr key={index}>
                  <td>{item.logoName}</td>
                  <td>{item.confidence}%</td>
                  <td>{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {videoUrl && (
        <div className="card shadow p-4 mb-4">
          <h2 className="h5">Processed Video</h2>
          <video
            controls
            className="w-100"
            type="video/mp4"
            src={videoUrl}
          ></video>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
