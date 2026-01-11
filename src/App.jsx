import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToDoIndex } from './components/todo-index';
import { ToDoUserRegister} from './components/todo-user-reigster'
import { ToDoUserLogin } from './components/todo-user-login';
import { ToDoUserDashBoard } from './components/todo-user-dashboard';
import { ToDoAddAppointment } from './components/todo-add-appointment';
import { ToDoEditAppointment } from './components/todo-edit-appointment';
import { ToDoDeleteAppointment } from './components/todo-delete-appointment';
import { useEffect, useState } from "react";
import { Loader } from "./components/Loader";

// New Components
import { ForgotPassword } from './components/ForgotPassword';
import { ForgotUserId } from './components/ForgotUserId';
import { ResetPassword } from './components/ResetPassword';

function App() {

    const [loading, setLoading] = useState(true);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    const warmed = localStorage.getItem("serverWarmed");

    if (!warmed) {
      setFirstVisit(true);
    }

    fetch("https://to-do-project-react-backend.onrender.com/api/health")
      .finally(() => {
        localStorage.setItem("serverWarmed", "true");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Loader
        message={
          firstVisit
            ? "Starting server… First load may take a few seconds ⏳"
            : "Loading…"
        }
      />
    );
  }

  return (
    <div className="App bg-image">
        <section>
          <BrowserRouter>
                <Routes>
                    <Route path='/' element={<ToDoIndex />} />
                    <Route path='register' element={<ToDoUserRegister/>} />
                    <Route path='login' element={<ToDoUserLogin />} />
                    <Route path='user-dashboard' element={<ToDoUserDashBoard />} />
                    <Route path='add-appointment' element={<ToDoAddAppointment />} />
                    <Route path='edit-appointment/:id' element={<ToDoEditAppointment />} />
                    <Route path='delete-appointment/:id' element={<ToDoDeleteAppointment />} />
                    
                    {/* New Routes */}
                    <Route path='forgot-password' element={<ForgotPassword />} />
                    <Route path='forgot-userid' element={<ForgotUserId />} />
                    <Route path='reset-password/:token' element={<ResetPassword />} />
                </Routes>
          </BrowserRouter>      
        </section>
    </div>
  );
}

export default App;
