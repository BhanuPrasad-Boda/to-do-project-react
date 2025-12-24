import axios from "../api/axiosConfig";
import { useFormik } from "formik";
import { useNavigate, Link } from "react-router-dom";

export function ToDoUserRegister() {
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      UserId: "",
      UserName: "",
      Password: "",
      Email: "",
      Mobile: "",
    },
    onSubmit: (user) => {
      axios.post("/users/register", user)
        .then(() => {
          alert("Registered successfully!");
          navigate("/login");
        })
        .catch(error => {
          console.log("ERROR RESPONSE:", error.response);
          const msg = error.response?.data?.message || "Registration cancelled";
          alert(msg);
        });
    },
  });

  return (
    <div className="text-start d-flex justify-content-center">
      <form className="bg-light p-3 mt-4" onSubmit={formik.handleSubmit}>
        <h3>Register User</h3>
        <dl>

          <dt>User Name</dt>
          <dd><input type="text" name="UserName" onChange={formik.handleChange} className="form-control" required/></dd>
          <dt>UserId</dt>
          <dd><input type="text" name="UserId" onChange={formik.handleChange} className="form-control" required/></dd>
          <dt>Password</dt>
          <dd><input type="password" name="Password" onChange={formik.handleChange} className="form-control" required/></dd>
          <dt>Email</dt>
          <dd><input type="email" name="Email" onChange={formik.handleChange} className="form-control" required/></dd>
          <dt>Mobile</dt>
          <dd><input type="text" name="Mobile" onChange={formik.handleChange} className="form-control" required/></dd>
        </dl>
        <button className="btn btn-warning w-100">Register</button>
        <div className="mt-2">
          <Link to="/login">Already have account? Login</Link>
        </div>
      </form>
    </div>
  );
}
