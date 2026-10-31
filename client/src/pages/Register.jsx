import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HardHat, UserPlus } from "lucide-react";

const labourTrades = ["Helper", "Mason", "Carpenter", "Plumber", "Electrician", "Painter", "Bar Bender", "Tiles Mason"];

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "builder",
    skill: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(formData);
      if (user.role === "builder") navigate("/builder");
      else if (user.role === "supervisor") navigate("/supervisor");
      else navigate("/labour");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-green-800 text-white flex items-center justify-center mx-auto shadow-lg shadow-green-900/30">
            <HardHat className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Account</h1>
          <p className="text-xs text-zinc-400">Create a Builder, Supervisor or Labour Worker account</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
              placeholder="e.g. Arpit Sachdeva"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
              placeholder="builder@example.com"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, skill: "" })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
            >
              <option value="builder">Builder / Contractor (Admin)</option>
              <option value="supervisor">Site Supervisor (Munshi)</option>
              <option value="labour">Labour Worker</option>
            </select>
          </div>

          {formData.role === "labour" && (
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Trade / Type of Work</label>
              <select
                required
                value={formData.skill}
                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="" disabled>Select your trade</option>
                {labourTrades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength="6"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-800 to-green-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-900/20 hover:opacity-90"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Already have an account? <Link to="/login" className="text-green-400 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};
