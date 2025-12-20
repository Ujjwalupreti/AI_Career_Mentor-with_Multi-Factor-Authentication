import React, { useEffect, useState } from "react";
import { Target, AlertCircle, ArrowLeft, Mail, Lock, User, MapPin, Key, Home } from "lucide-react";
import { signup, loginPassword, loginOtp, resendOtp, verifyToken, forgotPassword, resetPassword } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthInput = ({ icon: Icon, className = "", ...props }) => (
  <div className="relative group">
    {Icon && (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <input
      className={`w-full py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm ${Icon ? "pl-11 pr-4" : "px-4"} ${className}`}
      {...props}
    />
  </div>
);

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form");
  const [tempToken, setTempToken] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [locationString, setLocationString] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const extractErrorMsg = (err) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map(e => e.msg).join(", "); 
    if (typeof detail === "object") return JSON.stringify(detail);
    return err.message || "Action failed.";
  };

  const startOtpStep = (temp_token, message) => {
    setTempToken(temp_token);
    setStep("otp");
    setInfo("");
    setError("");
    setLoading(false);
    setCooldown(60);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);

    try {
      if (step === "otp" && mode !== "forgot") {
        if (!tempToken || !otp) throw new Error("Enter the OTP sent to your email.");
        const res = await loginOtp(tempToken, otp);
        if (res.access_token) {
          const profile = await verifyToken(res.access_token).catch(() => null);
          authLogin(res.access_token, profile);
          navigate("/dashboard");
          return;
        }
        throw new Error("OTP verification failed");
      }

      if (mode === "forgot" && step === "otp") {
        setStep("reset");
        setLoading(false);
        setInfo("Enter your new password to complete reset.");
        return;
      }

      if (mode === "forgot" && step === "reset") {
        if (!tempToken || !otp) throw new Error("Missing reset session or OTP");
        if (!newPassword || newPassword.length < 6) throw new Error("Choose a stronger password (min 6 chars)");
        const res = await resetPassword(email, tempToken, otp, newPassword);
        if (res.access_token) {
          const profile = await verifyToken(res.access_token).catch(() => null);
          authLogin(res.access_token, profile);
          navigate("/dashboard");
          return;
        }
        throw new Error(res.message || "Password reset failed");
      }

      if (mode === "login") {
        const res = await loginPassword(email, password);
        if (res.mfa_required && res.temp_token) startOtpStep(res.temp_token, res.message);
        else if (res.access_token) {
          const profile = await verifyToken(res.access_token).catch(() => null);
          authLogin(res.access_token, profile);
          navigate("/dashboard");
        } else {
          throw new Error("Unexpected login response");
        }
      } else if (mode === "signup") {
        if (!locationString.trim()) throw new Error("Please enter your city.");
        const res = await signup(email, password, name, currentRole, targetRole, locationString.trim());
        if (res.mfa_required && res.temp_token) startOtpStep(res.temp_token, res.message);
        else if (res.access_token) {
          const profile = await verifyToken(res.access_token).catch(() => null);
          authLogin(res.access_token, profile);
          navigate("/dashboard");
        } else {
          setInfo("Account created. Check your email for the OTP.");
          setMode("login");
        }
      } else if (mode === "forgot" && step === "form") {
        const res = await forgotPassword(email);
        if (res.mfa_required && res.temp_token) startOtpStep(res.temp_token, res.message);
        else setInfo(res.message || "If this email exists, a reset code has been sent.");
      }
    } catch (err) {
      setError(extractErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true); setError(""); setInfo("");

    try {
      const action = mode === "forgot" ? forgotPassword : resendOtp;
      const res = await action(email);
      if (res.mfa_required && res.temp_token) setTempToken(res.temp_token);
      setInfo(res.message || "Code resent.");
      setCooldown(60);
    } catch (err) {
      setError(extractErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = () => {
    if (loading) return "Processing...";
    if (mode === "forgot" && step === "reset") return "Set New Password";
    if (step === "otp") return "Verify Code";
    if (mode === "signup") return "Create Account";
    if (mode === "forgot") return "Send Reset Code";
    return "Sign In";
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-50">
 
      <button 
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 hover:text-blue-600 hover:shadow-md transition-all font-medium text-sm"
      >
        <Home className="w-4 h-4" />
        Back to Home
      </button>


      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 relative z-10 overflow-hidden animate-fadeIn">
        
        
        <div className="pt-8 pb-6 px-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 mx-auto mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {step === "otp" ? "Verify Identity" : (mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Welcome Back")}
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            {step === "otp" ? "Enter the code sent to your email" : (mode === "forgot" ? "Enter email to receive code" : "Access your AI Career roadmap")}
          </p>
        </div>

        <div className="px-8 pb-8">
      
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
      
          {info && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            
           
            {step !== "otp" && mode === "signup" && (
              <div className="space-y-3 animate-fadeIn">
                <AuthInput icon={User} placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                  <AuthInput icon={Target} placeholder="Current Role" value={currentRole} onChange={(e)=>setCurrentRole(e.target.value)} required />
                  <AuthInput icon={Target} placeholder="Target Role" value={targetRole} onChange={(e)=>setTargetRole(e.target.value)} required />
                </div>
                <AuthInput icon={MapPin} placeholder="City (e.g. London)" value={locationString} onChange={(e)=>setLocationString(e.target.value)} required />
              </div>
            )}

            
            {step !== "otp" && (
              <div className="space-y-4 animate-fadeIn">
                <AuthInput icon={Mail} type="email" placeholder="Email Address" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                {mode !== "forgot" && <AuthInput icon={Lock} type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />}
              </div>
            )}

            
            {step === "otp" && (
              <div className="space-y-5 animate-fadeIn">
                
                
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 leading-relaxed shadow-sm flex gap-2 items-start">
                   <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                   <div>
                     If you don't see the code, check your <strong>Spam/Junk folder</strong>.
                   </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Enter the 6-digit code sent to</p>
                  <p className="font-bold text-slate-900 mb-3 text-sm">{email}</p>
                  
                  <AuthInput 
                    className="text-center text-2xl tracking-[0.5em] font-mono font-bold py-3 text-slate-800" 
                    placeholder="000000" 
                    value={otp} 
                    onChange={(e)=>setOtp(e.target.value)} 
                    maxLength={6} 
                    required 
                    autoFocus 
                  />
                </div>

                <div className="flex justify-between items-center text-xs px-1">
                  <button type="button" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors" onClick={() => { setStep("form"); setOtp(""); setTempToken(null); setError(""); }}>
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>

                  <button
                    type="button"
                    className={`text-blue-600 font-bold hover:text-blue-700 transition-colors ${cooldown > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={handleResend}
                    disabled={loading || cooldown > 0}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </button>
                </div>
              </div>
            )}

            
            {mode === "forgot" && step === "reset" && (
              <div className="space-y-4 animate-fadeIn">
                <AuthInput icon={Key} type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-200">
              {buttonLabel()}
            </button>
          </form>

          
          {step !== "otp" && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500">
                  {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
                  <button className="text-blue-600 font-bold hover:text-blue-800 transition-colors" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); setStep("form"); }}>
                    {mode === "signup" ? "Sign In" : "Sign Up"}
                  </button>
                </p>

                {mode === "login" && (
                  <button className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors" onClick={() => { setMode("forgot"); setStep("form"); setError(""); setInfo(""); }}>
                    Forgot password?
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;