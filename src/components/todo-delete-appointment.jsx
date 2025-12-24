import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import axios from "axios";


export function ToDoDeleteAppointment()
{
    let params = useParams();
   const [appointments, setAppointments] = useState([{Appointment_Id:0, Title:'', Description:'', Date:new Date(), UserId:'' }]);



    let navigate = useNavigate();

    useEffect(()=>{

        axios.get(`http://127.0.0.1:5000/get-appointment/${params.id}`)
        .then(response=>{
            setAppointments(response.data);
        })

    },[])

    function handleDeleteClick(){
        axios.delete(`http://127.0.0.1:5000/delete-appointment/${params.id}`)
        .then(()=>{
            navigate('/user-dashboard');
        })
    }

    return(
        <div className="bg-light mt-3 w-25 text-start p-2">
            <h3>Delete Appointment</h3>
            <dl>
                <dt>Title</dt>
                <dd>{appointments[0].Title}</dd>
                <dt>Description</dt>
                <dd>{appointments[0].Description}</dd>
            </dl>
            <button onClick={handleDeleteClick} className="btn btn-danger me-2">Yes</button>
            <Link className="btn btn-warning" to="/user-dashboard"> No </Link>
        </div>
    )
}