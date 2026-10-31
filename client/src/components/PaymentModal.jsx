import React, { useState } from "react";
import api from "../api/api";
import { X, CircleDollarSign } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export const PaymentModal = ({ worker, projectId, wage, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(wage?.pendingAmount || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      await api.post("/payments", {
        workerId: worker._id,
        projectId: projectId || worker.projectId?._id || worker.projectId,
        amount: Number(amount),
        paymentMethod,
        reference,
        notes,
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Payment error:", e);
      alert(e.response?.data?.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-green-900/50 text-green-400 rounded-2xl border border-green-700/30">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Record Wage Payment</h3>
            <p className="text-xs text-zinc-400">{worker?.name} ({worker?.workerId})</p>
          </div>
        </div>

        {wage && (
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 mb-5 flex justify-between items-center text-xs">
            <div>
              <span className="text-zinc-400 block">Total Earned</span>
              <strong className="text-white font-mono text-sm">{formatCurrency(wage.totalWage)}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Paid So Far</span>
              <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(wage.paidAmount)}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Pending Balance</span>
              <strong className="text-rose-400 font-mono text-sm">{formatCurrency(wage.pendingAmount)}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-green-700"
              placeholder="e.g. 5000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Cash", "UPI", "Bank Transfer"].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    paymentMethod === m
                      ? "bg-green-800 text-white border-green-700 font-bold"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Transaction Reference / UPI ID
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-green-700"
              placeholder="e.g. UPI/2026/8947291"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-green-700"
              placeholder="e.g. Fortnight advance wage payment"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-green-800 to-green-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-900/20 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
