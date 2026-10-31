import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HardHat, LogIn, Building2, User, Sparkles } from "lucide-react";

export const Login = () => {
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      const user = await login(cleanEmail, cleanPassword);
      if (user.role === "builder") navigate("/builder");
      else if (user.role === "supervisor") navigate("/supervisor");
      else navigate("/labour");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. You can use password123 or 1-Click Login below.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setError("");
    setLoading(true);
    try {
      const user = await switchDemoRole(role);
      if (user.role === "builder") navigate("/builder");
      else if (user.role === "supervisor") navigate("/supervisor");
      else navigate("/labour");
    } catch (err) {
      setError("1-Click Login failed. Check that the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail, userRole) => {
    setEmail(userEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-green-800 text-white flex items-center justify-center mx-auto shadow-lg shadow-green-900/30">
            <HardHat className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Build<span className="text-green-400">Track</span>
          </h1>
          <p className="text-xs text-zinc-400">Sign in to manage construction sites, labour & wages</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-300">Email or Phone</label>
              <button
                type="button"
                onClick={() => fillCredentials("arpitsa@gmail.com", "builder")}
                className="text-[10px] text-green-400 hover:underline"
              >
                Auto-fill Builder
              </button>
            </div>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="arpitsa@gmail.com or phone"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-300">Password</label>
              <span className="text-[10px] text-zinc-400">Default: password123</span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-800 to-green-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-900/20 hover:opacity-90 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            {loading ? "Signing in..." : "Sign In to BuildTrack"}
          </button>
        </form>

        {/* 1-Click Instant Role Login (Perfect for Mobile) */}
        <div className="space-y-2.5 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-green-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              1-Click Fast Login (No typing needed):
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo("builder")}
              className="p-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-green-700/60 rounded-xl flex flex-col items-center gap-1 transition text-center group"
            >
              <Building2 className="w-4 h-4 text-green-400 group-hover:scale-110 transition" />
              <span className="text-[11px] font-bold text-white">Builder</span>
              <span className="text-[9px] text-zinc-400">Arpit</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo("supervisor")}
              className="p-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-500/60 rounded-xl flex flex-col items-center gap-1 transition text-center group"
            >
              <HardHat className="w-4 h-4 text-zinc-400 group-hover:scale-110 transition" />
              <span className="text-[11px] font-bold text-white">Supervisor</span>
              <span className="text-[9px] text-zinc-400">Munshi</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo("labour")}
              className="p-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/60 rounded-xl flex flex-col items-center gap-1 transition text-center group"
            >
              <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              <span className="text-[11px] font-bold text-white">Labour</span>
              <span className="text-[9px] text-zinc-400">Worker</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          New to BuildTrack?{" "}
          <Link to="/register" className="text-green-400 font-bold hover:underline">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
};
