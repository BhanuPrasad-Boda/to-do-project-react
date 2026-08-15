import React, { lazy, Suspense, useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ToDoIndex } from "./components/todo-index";
import { ToDoUserRegister } from "./components/todo-user-reigster";
import { ToDoUserLogin } from "./components/todo-user-login";
import { ToDoUserDashBoard } from "./components/todo-user-dashboard";
import { ToDoAddAppointment } from "./components/todo-add-appointment";
import { ToDoEditAppointment } from "./components/todo-edit-appointment";
import { ToDoDeleteAppointment } from "./components/todo-delete-appointment";
import Loader from "./components/Loader";
import { ForgotPassword } from "./components/ForgotPassword";
import { ForgotUserId } from "./components/ForgotUserId";
import { ResetPassword } from "./components/ResetPassword";
import { BrowserNotificationWatcher } from "./components/BrowserNotificationWatcher";
import { CompanionProvider } from "./companion/CompanionContext";
import { isAuthRoute } from "./companion/companionEngine";

const ProductivityCompanion = lazy(() => import("./companion/ProductivityCompanion"));

function CompanionGate() {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token || isAuthRoute(location.pathname)) return null;
  return (
    <Suspense fallback={null}>
      <ProductivityCompanion />
    </Suspense>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Loader show={loading} />
      {!loading && (
        <div className="App bg-image">
          <section>
            <BrowserRouter>
              <CompanionProvider>
                <BrowserNotificationWatcher />
                <Routes>
                  <Route path="/" element={<ToDoIndex />} />
                  <Route path="register" element={<ToDoUserRegister />} />
                  <Route path="login" element={<ToDoUserLogin />} />
                  <Route path="user-dashboard" element={<ToDoUserDashBoard />} />
                  <Route path="add-appointment" element={<ToDoAddAppointment />} />
                  <Route path="edit-appointment/:id" element={<ToDoEditAppointment />} />
                  <Route path="delete-appointment/:id" element={<ToDoDeleteAppointment />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                  <Route path="forgot-userid" element={<ForgotUserId />} />
                  <Route path="reset-password/:token" element={<ResetPassword />} />
                </Routes>
                <CompanionGate />
              </CompanionProvider>
            </BrowserRouter>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
