import React, { useState } from "react";
import { auth } from "./firebase";
import { deleteUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function DeleteAccount() {
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteUser(user);
        setStatus("✅ Account successfully deleted.");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setStatus("No user is currently signed in.");
      }
    } catch (err) {
      setStatus("Error deleting account: " + err.message);
    }
  };

  return (
    <div style={{padding:20}}>
      <h2>Delete My Account</h2>
      <p>This will permanently remove your account.</p>
      <button onClick={handleDelete} className="submit-button">Delete Account</button>
      {status && <p>{status}</p>}
    </div>
  );
}
