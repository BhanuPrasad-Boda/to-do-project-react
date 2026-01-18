import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/dashboardStyles.css";
import { DashboardCarousel } from "../components/DashboardCarousel";
import imageCompression from "browser-image-compression";

export function ToDoUserDashBoard() {

  const navigate = useNavigate();

  const [todos, setTodos] = useState([]);
 
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const BACKEND_URL = "https://to-do-project-react-backend.onrender.com";
  const [uploading, setUploading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);

   const [userData, setUserData] = useState(() => {
  const savedUser = localStorage.getItem("user");
  return savedUser ? JSON.parse(savedUser) : {};
});


const getAvatarUrl = (avatar) => {
  if (!avatar) return "/default-avatar.png";

  if (avatar.startsWith("http")) return avatar;

  return BACKEND_URL + avatar;
};

  // ================= DATE FORMAT =================

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  // ================= FETCH TODOS =================

   useEffect(() => {
  const token = localStorage.getItem("token");

  if (!userData.UserId || !token) {
    navigate("/login");
    return;
  }

  const fetchTodos = async () => {
    setLoadingTasks(true); // start loading

    try {
      const res = await axios.get(`/appointments/${userData.UserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodos(res.data);
    } catch (err) {
      toast.error("Failed to load tasks");
      localStorage.clear();
      navigate("/login");
    } finally {
      setLoadingTasks(false); // stop loading
    }
  };

  fetchTodos();
}, [navigate, userData.UserId]);


  // ================= SIGN OUT =================

  const handleSignout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ================= DELETE TODO =================

  const handleDelete = (id) => {

    toast(
      ({ closeToast }) => (
        <div>
          <p>Delete this task?</p>

          <div className="d-flex justify-content-end gap-2">

            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  await axios.delete(`/appointments/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  setTodos((prev) =>
                    prev.filter((t) => t.Appointment_Id !== id)
                  );

                  toast.success("Task deleted");

                } catch {
                  toast.error("Delete failed");
                }

                closeToast();
              }}
            >
              Yes
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={closeToast}
            >
              No
            </button>

          </div>
        </div>
      ),
      { autoClose: false }
    );
  };

  // ================= TOGGLE COMPLETE =================

  const handleToggleComplete = async (id) => {

    setTodos((prev) =>
      prev.map((t) =>
        t.Appointment_Id === id
          ? { ...t, completed: !t.completed }
          : t
      )
    );

    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `/appointments/toggle-complete/${id}`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTodos((prev) =>
        prev.map((t) =>
          t.Appointment_Id === id
            ? { ...t, completed: res.data.completed }
            : t
        )
      );

      toast.success(res.data.message);

    } catch {

      toast.error("Failed to update status");

      // rollback
      setTodos((prev) =>
        prev.map((t) =>
          t.Appointment_Id === id
            ? { ...t, completed: !t.completed }
            : t
        )
      );
    }
  };

  // ================= AVATAR SELECT =================
  const handleAvatarSelect = (e) => {

  const file = e.target.files[0];

  if (!file) return;

  // File type validation
  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }

  setSelectedFile(file);

  const previewURL = URL.createObjectURL(file);

  setPreview(previewURL);
};


  // ================= SAVE AVATAR =================
      const handleAvatarUpload = async () => {
  if (!selectedFile) {
    toast.error("Please select an image");
    return;
  }

  try {
    setUploading(true);

    // ✅ Get token
    const token = localStorage.getItem("token");

    // ✅ Compress image before upload
    const compressedFile = await imageCompression(selectedFile, {
      maxSizeMB: 0.4,        // target size under 400KB
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    // ✅ Prepare form data
    const formData = new FormData();
    formData.append("avatar", compressedFile);

    // ✅ Upload request
    const res = await axios.put("/users/upload-avatar", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    // ✅ Update UI + localStorage instantly
    const updatedUser = {
      ...userData,
      Avatar: res.data.Avatar,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUserData(updatedUser);

    toast.success("Avatar updated successfully ✅");

        setShowAvatarModal(false);
    setPreview(null);
    setSelectedFile(null);

  } catch (err) {
    console.error(err);
    toast.error("Avatar update failed ❌");

  } finally {
    setUploading(false);
  }
};

  

  // ================= JSX =================

  return (

    <div className="dashboard-page">

      <div className="container">

        {/* HEADER */}
        <div className="dashboard-header animate-down">

          <h2>Dashboard</h2>

          <div className="dashboard-user-box">

            <img
  src={getAvatarUrl(userData.Avatar)}
  className="dashboard-avatar"
  alt="avatar"
  onClick={() => setShowAvatarModal(true)}
/>




            <button
              onClick={handleSignout}
              className="btn btn-outline-danger btn-sm"
            >
              Sign out
            </button>

          </div>

        </div>

        {/* AVATAR MODAL */}
{showAvatarModal && (
  <div className="avatar-modal-overlay">
    <div className="avatar-modal">
      <h5>Change Avatar</h5>

      <input
        type="file"
        accept="image/*"
        onChange={handleAvatarSelect}
      />

<div className="avatar-preview">
          <img
  src={
    preview
      ? preview
      : getAvatarUrl(userData.Avatar)
  }
  alt="avatar preview"
  className="avatar-preview-img"
/>

</div>


      <div className="avatar-actions">
        <button
          className="btn btn-outline-warning btn-sm"
          onClick={() => {
            setShowAvatarModal(false);
            setPreview(null);       // reset preview if modal closed
            setSelectedFile(null);  // clear file selection
          }}
        >
          Cancel
        </button>

        <button
  onClick={handleAvatarUpload}
  disabled={uploading}
  className="save-btn"
>
  {uploading ? "Uploading..." : "Save"}
</button>

      </div>
    </div>
  </div>
)}


        {/* WELCOME CARD */}
        <div className="welcome-card animate-up">

  <div className="welcome-row">

    <div className="welcome-text">
      <h5>
        Welcome, <span>{userData.UserName || "User"}</span> 👋
      </h5>
    </div>

    <div className="welcome-action">
      <Link to="/add-appointment" className="btn btn-primary btn-sm">
        + Add Task
      </Link>
    </div>

  </div>

</div>


        <DashboardCarousel />

        {/* EMPTY STATE */}


        {/* TODOS */}
            {/* TASKS SECTION */}
<div className="row g-4 mt-1">
  {loadingTasks ? (
    <div className="empty-state animate-fade">Loading your tasks... ⏳</div>
  ) : todos.length === 0 ? (
    <div className="empty-state animate-fade">No tasks found 😊</div>
  ) : (
    todos.map((todo) => (
      <div
        key={todo.Appointment_Id}
        className="col-12 col-md-6 col-lg-4 animate-card"
      >
        <div className={`appointment-card ${todo.completed ? "completed-card" : ""}`}>
          <h5>{todo.Title}</h5>
          <p>{todo.Description}</p>
          <div className="meta">📅 {formatDateTime(todo.Date)}</div>
          <div className="timestamps">
            Created: {formatDateTime(todo.createdAt)} <br />
            Updated: {formatDateTime(todo.updatedAt)}
          </div>
          <div className="actions d-flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm ${todo.completed ? "btn-success" : "btn-outline-secondary"}`}
              onClick={() => handleToggleComplete(todo.Appointment_Id)}
            >
              {todo.completed ? "Completed ✅" : "Mark Done ✔️"}
            </button>
            <Link
              to={`/edit-appointment/${todo.Appointment_Id}`}
              className="btn btn-outline-warning btn-sm"
            >
              Edit
            </Link>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => handleDelete(todo.Appointment_Id)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    ))
  )}
</div>


      </div>

    </div>
  );
}
