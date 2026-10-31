import Expense from "../models/Expense.js";

export const createExpense = async (req, res, next) => {
  try {
    const { projectId, category, amount, description, date, vendor } = req.body;
    let receiptUrl = req.body.receiptUrl;

    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    }

    if (!projectId || !category || !amount || !description) {
      return res.status(400).json({ message: "projectId, category, amount, and description are required" });
    }

    const expense = await Expense.create({
      projectId,
      category,
      amount: Number(amount),
      description,
      date: date || new Date().toISOString().split("T")[0],
      addedBy: req.user._id,
      vendor: vendor || "",
      receiptUrl: receiptUrl || "",
    });

    const populated = await Expense.findById(expense._id)
      .populate("addedBy", "name")
      .populate("projectId", "name");

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const { projectId, category, startDate, endDate, month } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (category && category !== "all") filter.category = category;
    if (month) {
      filter.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(filter)
      .populate("addedBy", "name")
      .populate("projectId", "name location")
      .sort({ date: -1 });

    const totalAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    // Group by category
    const categoryBreakdown = {};
    expenses.forEach((exp) => {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    res.json({
      totalAmount,
      categoryBreakdown,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
