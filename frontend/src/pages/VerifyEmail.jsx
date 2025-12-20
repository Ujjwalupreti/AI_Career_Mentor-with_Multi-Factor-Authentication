// src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

const VerifyEmail = () => {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }
      try {
        const res = await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage(res.data?.message || "Email verified.");
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Verification failed.");
      }
    };
    verify();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow p-6 rounded-lg max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">
          {status === "verifying" && "Verifying Email..."}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="text-gray-700 mb-4">{message}</p>

        {(status === "success" || status === "error") && (
          <button onClick={() => navigate("/login")} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
