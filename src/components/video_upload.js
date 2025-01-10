import React, { useState, useEffect,useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import SummaryReport from "./summary_report";
import Select from "react-select";



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
  const [modules, setModules] = useState([]); // Store available .pt files
  const [selectedModule, setSelectedModule] = useState(""); // Store selected module
  const [classNames, setClasses] = useState([]); // Store classes for the selected module
  const [selectedClasses, setSelectedClasses] = useState([]); // Update for multi-select


  let socket = null;


  useEffect(() => {
    // Fetch available modules and classes on component mount
    const fetchModules = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/get-modules`);  // Calling the new API
        setModules(data.modules);  // Set modules list
      } catch (err) {
        console.error("Error fetching modules:", err);
      }
    };
    fetchModules();
  }, []);



  const handleModuleChange = async (e) => {
    const moduleName = e.target.value;
    setSelectedModule(moduleName);

    if (moduleName) {
      try {
        // Fetch the classes for the selected module
        const response = await axios.get(`http://localhost:5000/get-classes?filename=${moduleName}`);
        if (response.data.classes) {
          // Convert the object to an array of class names
          const classArray = Object.values(response.data.classes); 
          setClasses(classArray);  // Set the classes to the state
          console.log("Vikas Classes:", classArray);  // Check the classes
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    }
  };



  const fileInputRef = useRef(null); // Ref for the file input element

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

      socket.emit("task", { taskId: data.taskId, bucket, key,moduleName:selectedModule,classNames:selectedClasses.map((c) => c.value) });

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
    setSelectedClasses([]);
    setSelectedModule("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
  };
  const handleClassChange = (selectedOptions) => {

    setSelectedClasses(selectedOptions || []); // Handle multi-select changes
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
        <h2 className="h5">Step 2: Select Object</h2>
        <div className="row">
          <div className="col-6">
            <label htmlFor="moduleSelect1" className="form-label">
              Select Module:
            </label>
            <select
              id="moduleSelect1"
              className="form-select"
              onChange={handleModuleChange}
              value={selectedModule}
              disabled={taskStarted}
            >
              <option value="">-- Select an Option --</option>
              {modules.map((module, index) => (
                <option key={index} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6">
          <label htmlFor="moduleSelect2" className="form-label">
            Select Classes:
          </label>
          <Select
            id="moduleSelect2"
            isMulti
            options={classNames.map((className) => ({
              value: className,
              label: className,
            }))}
            value={selectedClasses}
            onChange={handleClassChange}
            isDisabled={!classNames.length || taskStarted} // Disable if no classes are available
            placeholder="-- Select Classes --"
          />
        </div>
        </div>
      </div>


      <div className="card shadow p-4 mb-4">
        <h2 className="h5">Step 3: Start Detection Task 
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
