import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/dashboardStyles.css";
import "../styles/appExtras.css";
import "../styles/responsive.css";
import imageCompression from "browser-image-compression";
import { TaskCard } from "./TaskCard";
import { DashboardControls } from "./DashboardControls";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationSettings } from "./NotificationSettings";
import { MobileTabBar } from "./MobileTabBar";
import { DailyPlanning } from "./DailyPlanning";
import { OverduePrompt } from "./OverduePrompt";
import { NotificationPermissionBanner } from "./NotificationPermissionBanner";
import { QuickCapture } from "./QuickCapture";
import { AutoPilotBar } from "./AutoPilotBar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTheme } from "../context/ThemeContext";
import { useCompanion } from "../companion/CompanionContext";

export function ToDoUserDashBoard() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const { theme } = useTheme();
  const { publishSnapshot, registerActions, emitEvent } = useCompanion();

  const [userData, setUserData] = useState({ UserName: "", Email: "", Mobile: "", Avatar: "", notificationPreferences: {} });
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("tasks");
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [overdueTask, setOverdueTask] = useState(null);
  const [rescheduleOptions, setRescheduleOptions] = useState([]);
  const [assistant, setAssistant] = useState(null);
  const [autopilotBusy, setAutopilotBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadDashboard = useCallback(async () => {
    const userId = localStorage.getItem("userid");
    const token = localStorage.getItem("token");
    if (!userId || !token) {
      toast.error("Please login to access dashboard");
      navigate("/login");
      return;
    }
    try {
      const [userRes, tasksRes, statsRes, planRes, notifRes, assistantRes] = await Promise.allSettled([
        axios.get(`/users/get-user/${userId}`),
        axios.get(`/appointments/get-appointments/${userId}`),
        axios.get("/appointments/stats/productivity"),
        axios.get("/appointments/plan/today"),
        axios.get("/notifications/unread-count"),
        axios.get("/appointments/assistant"),
      ]);
      if (userRes.status === "fulfilled" && userRes.value.data) {
        setUserData(userRes.value.data);
        const browserOn = userRes.value.data.notificationPreferences?.browserNotifications !== false;
        localStorage.setItem("tf_browser_notify", browserOn ? "1" : "0");
      }
      if (tasksRes.status === "fulfilled" && tasksRes.value.data) {
        const fetchedTodos = Array.isArray(tasksRes.value.data) ? tasksRes.value.data : tasksRes.value.data.items || [tasksRes.value.data];
        setTodos(fetchedTodos);
      }
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (planRes.status === "fulfilled") setPlan(planRes.value.data);
      if (assistantRes.status === "fulfilled") setAssistant(assistantRes.value.data);
      if (notifRes.status === "fulfilled") setUnread(notifRes.value.data.unread || 0);
      const fatal = [userRes, tasksRes].some((r) => r.status === "rejected");
      if (fatal) {
        const err = (userRes.status === "rejected" ? userRes.reason : tasksRes.reason);
        setError("Failed to load dashboard data.");
        if (err.response?.status !== 401) {
          toast.error(err.response?.data?.message || "Failed to load dashboard data");
        }
      } else {
        setError(null);
      }
    } catch (err) {
      setError("Failed to load dashboard data.");
      if (err.response?.status !== 401) {
        toast.error(err.response?.data?.message || "Failed to load dashboard data");
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onUnread = (event) => {
      if (typeof event.detail?.unread === "number") setUnread(event.detail.unread);
    };
    window.addEventListener("tf-unread", onUnread);
    return () => window.removeEventListener("tf-unread", onUnread);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      axios.get("/notifications/unread-count").then((res) => setUnread(res.data.unread || 0)).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches("input, textarea, select")) return;
      if (e.key === "n") {
        e.preventDefault();
        document.getElementById("quick-capture")?.focus();
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("task-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(
    () => [...new Set(todos.map((t) => t.category).filter(Boolean))],
    [todos]
  );

  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos];
    const now = Date.now();

    if (filter === "completed") result = result.filter((t) => t.completed);
    else if (filter === "pending") result = result.filter((t) => !t.completed);
    else if (filter === "overdue") result = result.filter((t) => !t.completed && t.Date && new Date(t.Date) < now);

    if (priority !== "all") result = result.filter((t) => t.Priority === priority);
    if (category !== "all") result = result.filter((t) => t.category === category);

    if (debouncedSearch.trim() !== "") {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.Title?.toLowerCase().includes(q) ||
          t.Description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => String(tag).toLowerCase().includes(q))
      );
    }

    const rank = { High: 0, Medium: 1, Low: 2 };
    result.sort((a, b) => {
      const dateA = new Date(a.Date || 0).getTime();
      const dateB = new Date(b.Date || 0).getTime();
      const createdA = new Date(a.createdAt || a.Date || 0).getTime();
      const createdB = new Date(b.createdAt || b.Date || 0).getTime();
      switch (sort) {
        case "newest": return createdB - createdA;
        case "oldest": return createdA - createdB;
        case "dueDateAsc": return dateA - dateB;
        case "dueDateDesc": return dateB - dateA;
        case "priority": return (rank[a.Priority] ?? 1) - (rank[b.Priority] ?? 1);
        case "updated": return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        case "titleAZ": return (a.Title || "").localeCompare(b.Title || "");
        case "titleZA": return (b.Title || "").localeCompare(a.Title || "");
        default: return 0;
      }
    });
    return result;
  }, [todos, filter, debouncedSearch, sort, priority, category]);

  const handleSignout = async () => {
    try { await axios.post("/users/logout"); } catch { /* ignore */ }
    localStorage.clear();
    toast.info("Signed out successfully");
    navigate("/login");
  };

  const handleToggleComplete = async (id) => {
    const task = todos.find((t) => t.Appointment_Id === id);
    if (!task) return;
    const updatedTask = { ...task, completed: !task.completed };
    setTodos((prev) => prev.map((t) => (t.Appointment_Id === id ? updatedTask : t)));
    try {
      await axios.put(`/appointments/toggle-complete/${id}`);
      toast.success(updatedTask.completed ? "Task marked completed!" : "Task marked pending");
      if (updatedTask.completed) emitEvent("completed");
      loadDashboard();
    } catch {
      setTodos((prev) => prev.map((t) => (t.Appointment_Id === id ? task : t)));
      toast.error("Failed to update task status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axios.delete(`/appointments/delete-appointment/${id}`);
      setTodos((prev) => prev.filter((t) => t.Appointment_Id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const openOverdue = async (task) => {
    setOverdueTask(task);
    try {
      const res = await axios.get(`/appointments/${task.Appointment_Id}/reschedule-options`);
      setRescheduleOptions(res.data.suggestions || []);
    } catch {
      setRescheduleOptions([]);
    }
  };

  const handleReschedule = async (id, date) => {
    try {
      await axios.put(`/appointments/reschedule/${id}`, { Date: date });
      toast.success("Task rescheduled");
      setOverdueTask(null);
      loadDashboard();
    } catch {
      toast.error("Unable to reschedule");
    }
  };

  const handleSnooze = async (id) => {
    setAutopilotBusy(true);
    try {
      const res = await axios.put(`/appointments/snooze/${id}`, { minutes: 60 });
      if (res.data.assistant) setAssistant(res.data.assistant);
      toast.success("Paused for 1 hour. It stays on your list and comes back to Autopilot after that.");
      loadDashboard();
    } catch {
      toast.error("Unable to snooze");
    } finally {
      setAutopilotBusy(false);
    }
  };

  const handleCatchUp = async () => {
    setAutopilotBusy(true);
    try {
      const res = await axios.post("/appointments/catch-up");
      toast.success(res.data.message || "Leftovers lined up");
      loadDashboard();
    } catch {
      toast.error("Could not line up leftover tasks");
    } finally {
      setAutopilotBusy(false);
    }
  };

  const handleApplyPlan = async () => {
    setAutopilotBusy(true);
    try {
      const res = await axios.post("/appointments/apply-plan");
      toast.success(res.data.message || "Untimed tasks scheduled");
      loadDashboard();
    } catch {
      toast.error("Could not schedule untimed tasks");
    } finally {
      setAutopilotBusy(false);
    }
  };

  useEffect(() => {
    publishSnapshot({
      pathname: "/user-dashboard",
      view,
      filter,
      todos,
      stats,
      prefs: userData.notificationPreferences,
      unread,
      onboardingStatus: userData.onboardingStatus,
      currentTourStep: userData.currentTourStep,
    });
  }, [publishSnapshot, view, filter, todos, stats, userData, unread]);

  useEffect(() => {
    registerActions({
      goPlan: () => setView("plan"),
      showNotifications: () => setView("notifications"),
      showTasks: (nextFilter) => {
        setView("tasks");
        setFilter(nextFilter || "all");
      },
      filterHigh: () => {
        setView("tasks");
        setPriority("High");
      },
      catchUp: handleCatchUp,
      applyPlan: handleApplyPlan,
      complete: handleToggleComplete,
      refresh: loadDashboard,
      openOverdue: (id) => {
        const task =
          todos.find((item) => item.Appointment_Id === id) ||
          todos.find((item) => !item.completed && item.Date && new Date(item.Date) < Date.now());
        if (task) openOverdue(task);
      },
    });
    // Latest handlers are stored on a ref inside CompanionProvider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerActions, todos]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const compressImage = async (file) => {
    try {
      return await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true });
    } catch {
      return file;
    }
  };

  const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      toast.warning("Please select an image first");
      return;
    }
    try {
      setUploading(true);
      const compressedFile = await compressImage(selectedFile);
      const base64Image = await convertToBase64(compressedFile);
      const userId = localStorage.getItem("userid");
      const response = await axios.put(`/users/update-avatar/${userId}`, { Avatar: base64Image });
      setUserData((prev) => ({ ...prev, Avatar: response.data.user.Avatar }));
      toast.success("Avatar updated successfully!");
      setShowAvatarModal(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update avatar. Image might be too large.");
    } finally {
      setUploading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "No due date";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const totalTasks = todos.length;
  const completedTasks = todos.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const firstName = (userData.UserName || "there").split(" ")[0];
  const completionPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const chartData = [
    { name: "Done", value: Math.max(completedTasks, 0) },
    { name: "Open", value: Math.max(pendingTasks, 0) },
  ];
  const chartColors = theme === "dark" ? ["#34d399", "#64748b"] : ["#059669", "#94a3b8"];
  const axisColor = theme === "dark" ? "#94a3b8" : "#6b7280";
  const gridColor = theme === "dark" ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.08)";
  const tooltipStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text-primary)",
  };
  const priorityRows = [
    { label: "High", count: stats?.priority?.High ?? 0, color: "#dc2626" },
    { label: "Medium", count: stats?.priority?.Medium ?? 0, color: "#d97706" },
    { label: "Low", count: stats?.priority?.Low ?? 0, color: "#2563eb" },
  ];
  const openPriorityTotal = priorityRows.reduce((sum, row) => sum + row.count, 0);
  const trendData = (stats?.productivity?.trend || []).map((item) => ({
    ...item,
    label: new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
  }));

  return (
    <div className="saas-layout">
      <aside className="saas-sidebar d-none d-lg-flex">
        <div className="saas-sidebar-header">
          <span className="brand-mark"><i className="bi bi-check2-square"></i></span>
          <span className="saas-title m-0">TaskFlow</span>
        </div>
        <div className="saas-sidebar-content">
          <nav className="d-flex flex-column gap-1" aria-label="Dashboard">
            <button type="button" className={`saas-nav-item ${view === "tasks" ? "active" : ""}`} onClick={() => setView("tasks")}><i className="bi bi-grid-1x2"></i> Overview</button>
            <button type="button" className={`saas-nav-item ${view === "plan" ? "active" : ""}`} onClick={() => setView("plan")}><i className="bi bi-calendar-week"></i> Daily plan</button>
            <button type="button" className={`saas-nav-item ${view === "notifications" ? "active" : ""}`} data-guide="guide-notifications" onClick={() => setView("notifications")}>
              <i className="bi bi-bell"></i> Notifications
              {unread > 0 && <span className="unread-badge ms-auto">{unread}</span>}
            </button>
            <button type="button" className={`saas-nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}><i className="bi bi-sliders"></i> Settings</button>
          </nav>
          <div className="sidebar-mini">
            <div className="saas-subtitle mb-2">This workspace</div>
            <div className="mini-stat"><span>Total</span><strong>{totalTasks}</strong></div>
            <div className="mini-stat"><span>Completed</span><strong>{completedTasks}</strong></div>
            <div className="mini-stat"><span>Open</span><strong>{pendingTasks}</strong></div>
          </div>
        </div>
        <div className="saas-sidebar-footer">
          <div className="sidebar-user">
            <img src={userData?.Avatar || "/default-avatar.png"} alt="" onClick={() => setShowAvatarModal(true)} />
            <div className="min-width-0">
              <div className="sidebar-user-name text-truncate">{userData.UserName || "User"}</div>
              <div className="saas-subtitle text-truncate">{userData.Email || ""}</div>
            </div>
          </div>
          <button type="button" onClick={handleSignout} className="signout-btn">
            <i className="bi bi-box-arrow-right me-1"></i> Sign out
          </button>
        </div>
      </aside>

      <main className="saas-main">
        <div className="mobile-topbar d-lg-none">
          <div className="d-flex align-items-center gap-2 min-width-0">
            <span className="brand-mark"><i className="bi bi-check2-square"></i></span>
            <span className="fw-semibold text-truncate">TaskFlow</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />
            <img src={userData?.Avatar || "/default-avatar.png"} alt="" className="mobile-avatar" onClick={() => setShowAvatarModal(true)} />
          </div>
        </div>

        <header className="saas-header d-none d-lg-flex">
          <div className="header-copy">
            <h1 className="dash-heading">{greeting}, {firstName}</h1>
            <div className="dash-date">{todayLabel}</div>
          </div>
          <div className="header-actions">
            <div className="position-relative">
            <button type="button" className="icon-btn" data-guide="guide-notifications" data-notif-toggle aria-label="Notifications" onClick={() => setNotifOpen((v) => !v)}>
                <i className="bi bi-bell"></i>
                {unread > 0 && <span className="unread-badge position-absolute top-0 start-100 translate-middle">{unread}</span>}
              </button>
              <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} onChanged={setUnread} />
            </div>
            <ThemeToggle />
            <Link to="/add-appointment" className="btn-new-task" data-guide="guide-add-task">
              <i className="bi bi-plus-lg"></i> New task
            </Link>
          </div>
        </header>

        <div className="saas-content">
          <NotificationPermissionBanner
            enabled={userData.notificationPreferences?.browserNotifications !== false}
            onGranted={() => setUserData((prev) => ({
              ...prev,
              notificationPreferences: { ...prev.notificationPreferences, browserNotifications: true },
            }))}
          />
          <div className="d-lg-none mb-3">
            <h1 className="dash-heading">{greeting}, {firstName}</h1>
            <div className="dash-date">{todayLabel}</div>
          </div>

          {error && (
            <div className="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>{error}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={loadDashboard}>Retry</button>
            </div>
          )}

          {view === "tasks" && (
            <>
              <QuickCapture onCreated={() => { emitEvent("created"); loadDashboard(); }} />
              <AutoPilotBar
                assistant={assistant}
                busy={autopilotBusy}
                onComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onCatchUp={handleCatchUp}
                onReschedule={openOverdue}
                onReview={() => setView("plan")}
              />
              <div className="kpi-grid" data-guide="guide-overview">
                <article className="kpi-card">
                  <div className="kpi-icon blue"><i className="bi bi-ui-checks"></i></div>
                  <div>
                    <div className="kpi-label">Remaining</div>
                    <div className="kpi-value">{stats?.today?.remaining ?? pendingTasks}</div>
                    <div className="kpi-hint">Still open</div>
                  </div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-icon green"><i className="bi bi-check2-circle"></i></div>
                  <div>
                    <div className="kpi-label">Completed</div>
                    <div className="kpi-value">{stats?.today?.completed ?? completedTasks}</div>
                    <div className="kpi-hint">Finished today</div>
                  </div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-icon red"><i className="bi bi-exclamation-circle"></i></div>
                  <div>
                    <div className="kpi-label">Overdue</div>
                    <div className="kpi-value">{stats?.today?.overdue ?? 0}</div>
                    <div className="kpi-hint">Needs attention</div>
                  </div>
                </article>
                <article className="kpi-card">
                  <div className="kpi-icon amber"><i className="bi bi-lightning-charge"></i></div>
                  <div>
                    <div className="kpi-label">Streak</div>
                    <div className="kpi-value">{stats?.productivity?.streak ?? 0}d</div>
                    <div className="kpi-hint">Days in a row</div>
                  </div>
                </article>
              </div>

              <div className="dash-workspace">
                <section>
                  <div className="task-toolbar">
                    <div>
                      <div className="page-kicker">Workspace</div>
                      <h2 className="h5 fw-semibold m-0">Tasks</h2>
                    </div>
                    <span className="saas-subtitle">{filteredAndSortedTodos.length} shown</span>
                  </div>
                  <div className="task-board" ref={searchRef} data-guide="guide-tasks">
                    <div className="task-board-filters">
                      <DashboardControls
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        filter={filter} setFilter={setFilter}
                        sort={sort} setSort={setSort}
                        priority={priority} setPriority={setPriority}
                        category={category} setCategory={setCategory}
                        categories={categories}
                      />
                    </div>
                    {loadingTasks ? (
                      <>
                        <div className="skeleton-card" style={{ minHeight: 72, borderRadius: 0 }} />
                        <div className="skeleton-card" style={{ minHeight: 72, borderRadius: 0 }} />
                        <div className="skeleton-card" style={{ minHeight: 72, borderRadius: 0 }} />
                      </>
                    ) : filteredAndSortedTodos.length === 0 ? (
                      <div className="empty-board">
                        <i className="bi bi-inbox mb-3 d-block"></i>
                        <p className="fw-semibold mb-1">{filter === "completed" ? "No completed tasks yet" : "You're all caught up"}</p>
                        <p className="saas-subtitle mb-3">Create a task to start planning your day.</p>
                        <Link to="/add-appointment" className="btn-new-task">New task</Link>
                      </div>
                    ) : (
                      filteredAndSortedTodos.map((todo) => (
                        <TaskCard
                          key={todo.Appointment_Id}
                          task={todo}
                          formatDateTime={formatDateTime}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onOverdue={openOverdue}
                        />
                      ))
                    )}
                  </div>
                </section>

                <aside className="insight-panel" data-guide="guide-productivity">
                  <div className="saas-card insight-card">
                    <h3>Workload</h3>
                    {totalTasks > 0 ? (
                      <>
                        <div className="donut-wrap">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={52}
                                outerRadius={70}
                                paddingAngle={2}
                                stroke="none"
                              >
                                {chartData.map((entry, i) => (
                                  <Cell key={entry.name} fill={chartColors[i]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="donut-center">
                            <strong>{completionPct}%</strong>
                            <span>complete</span>
                          </div>
                        </div>
                        <div className="chart-legend">
                          <div className="legend-row">
                            <span><span className="legend-dot" style={{ background: chartColors[0] }} /> Done</span>
                            <strong>{completedTasks}</strong>
                          </div>
                          <div className="legend-row">
                            <span><span className="legend-dot" style={{ background: chartColors[1] }} /> Open</span>
                            <strong>{pendingTasks}</strong>
                          </div>
                        </div>
                        <div className="workload-progress">
                          {[
                            ["Today", stats?.progress?.daily ?? 0],
                            ["Week", stats?.progress?.weekly ?? 0],
                            ["Month", stats?.progress?.monthly ?? 0],
                          ].map(([label, value]) => (
                            <div className="progress-row" key={label}>
                              <span>{label}</span>
                              <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, value)}%` }} /></div>
                              <strong>{value}%</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="chart-empty">No tasks yet</div>
                    )}
                  </div>

                  <div className="saas-card insight-card">
                    <h3>Open by priority</h3>
                    {openPriorityTotal > 0 ? (
                      <>
                        <div className="priority-stack" aria-hidden="true">
                          {priorityRows.map((row) => (
                            row.count > 0 ? (
                              <span
                                key={row.label}
                                style={{ width: `${(row.count / openPriorityTotal) * 100}%`, background: row.color }}
                              />
                            ) : null
                          ))}
                        </div>
                        {priorityRows.map((row) => (
                          <div className="priority-row" key={row.label}>
                            <span className="priority-dot" style={{ background: row.color }} />
                            <span>{row.label}</span>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${Math.round((row.count / openPriorityTotal) * 100)}%`,
                                  background: row.color,
                                }}
                              />
                            </div>
                            <strong>{row.count}</strong>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="chart-empty">No open tasks</div>
                    )}
                  </div>

                  <div className="saas-card insight-card">
                    <h3>Last 7 days</h3>
                    {trendData.length ? (
                      <div className="chart-box trend-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid vertical={false} stroke={gridColor} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11, fill: axisColor }}
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 10, fill: axisColor }}
                              axisLine={false}
                              tickLine={false}
                              width={28}
                            />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                              formatter={(value, name) => [value, name === "completed" ? "Completed" : "Scheduled"]}
                            />
                            <Bar dataKey="total" fill={gridColor} radius={[4, 4, 0, 0]} maxBarSize={18} />
                            <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="chart-empty">Not enough history yet</div>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}

          {view === "plan" && (
            <DailyPlanning
              plan={plan}
              tasks={todos}
              onApply={handleApplyPlan}
              onCatchUp={handleCatchUp}
              onToggleComplete={handleToggleComplete}
              busy={autopilotBusy}
            />
          )}
          {view === "notifications" && (
            <div>
              <div className="mb-3">
                <div className="page-kicker">Inbox</div>
                <h2 className="dash-heading">Notifications</h2>
              </div>
              <NotificationCenter open onClose={() => setView("tasks")} onChanged={setUnread} inline />
            </div>
          )}
          {view === "settings" && (
            <>
            <NotificationSettings
              preferences={userData.notificationPreferences}
              onSaved={(next) => setUserData((prev) => ({ ...prev, notificationPreferences: next }))}
            />
            <button type="button" onClick={handleSignout} className="signout-btn d-lg-none mt-3 w-100">
              <i className="bi bi-box-arrow-right me-1"></i> Sign out
            </button>
            </>
          )}
        </div>
      </main>

      {showAvatarModal && (
        <div className="avatar-modal-overlay">
          <div className="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-title">
            <h5 id="avatar-title" className="fw-bold">Profile photo</h5>
            <input type="file" accept="image/*" className="form-control mt-3" onChange={handleAvatarSelect} />
            <div className="avatar-preview">
              <img src={preview || userData?.Avatar || "/default-avatar.png"} className="avatar-preview-img" alt="preview" />
            </div>
            <div className="avatar-actions">
              <button className="btn btn-outline-secondary" onClick={() => { setShowAvatarModal(false); setPreview(null); setSelectedFile(null); }}>Cancel</button>
              <button onClick={handleAvatarUpload} disabled={uploading} className="btn-new-task border-0">{uploading ? "Uploading..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <OverduePrompt
        task={overdueTask}
        suggestions={rescheduleOptions}
        onComplete={(id) => { handleToggleComplete(id); setOverdueTask(null); }}
        onReschedule={handleReschedule}
        onKeep={() => setOverdueTask(null)}
        onClose={() => setOverdueTask(null)}
      />

      <MobileTabBar view={view} setView={setView} unread={unread} />
    </div>
  );
}
