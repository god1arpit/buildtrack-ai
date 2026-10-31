from datetime import date, datetime, timedelta
from math import ceil
from statistics import median, pstdev

class CompletionPredictionEngine:
    """
    Module 6: Prediction Engine
    Analyzes historical progress velocity, active workforce, and equipment utilization
    to forecast remaining project duration and projected completion date.
    """

    def predict_completion(self, total_km: float, completed_km: float, historical_records: list = None) -> dict:
        remaining_km = max(0.0, total_km - completed_km)
        if remaining_km == 0:
            return {
                "estimated_days_remaining": 0,
                "predicted_completion_date": str(date.today()),
                "daily_pace_km": 0.0,
                "confidence_score": 100.0,
                "status": "Completed"
            }

        # Only use real, dated progress intervals. A single record (or multiple
        # records on the same date) cannot establish a measured production rate.
        dated_records = []
        for record in historical_records or []:
            recorded = getattr(record, "recorded_date", None)
            completed = getattr(record, "completed_length", None)
            if recorded is None or completed is None:
                continue
            if isinstance(recorded, datetime):
                recorded = recorded.date()
            elif not isinstance(recorded, date):
                try:
                    recorded = date.fromisoformat(str(recorded)[:10])
                except ValueError:
                    continue
            dated_records.append((recorded, float(completed)))

        dated_records.sort(key=lambda item: item[0])
        rates = []
        for (previous_date, previous_km), (current_date, current_km) in zip(dated_records, dated_records[1:]):
            elapsed_days = (current_date - previous_date).days
            delta_km = current_km - previous_km
            if elapsed_days > 0 and delta_km > 0:
                rates.append(delta_km / elapsed_days)

        has_measured_pace = bool(rates)
        projected_daily_pace = median(rates) if has_measured_pace else 0.28  # clearly labeled 280 m/day fallback

        estimated_days = int(ceil(remaining_km / projected_daily_pace))
        predicted_date = date.today() + timedelta(days=estimated_days)

        if has_measured_pace:
            spread = pstdev(rates) / max(projected_daily_pace, 1e-9) if len(rates) > 1 else 0.5
            confidence = round(min(85.0, max(40.0, 55.0 + min(len(rates), 5) * 5.0 - min(spread, 1.0) * 20.0)), 1)
            forecast_basis = f"Median of {len(rates)} positive, dated progress interval(s)"
            status = "On Track" if estimated_days < 120 else "Delayed Risks"
        else:
            confidence = 30.0
            forecast_basis = "Baseline pace only; dated progress history is insufficient"
            status = "Baseline Estimate"

        return {
            "estimated_days_remaining": estimated_days,
            "predicted_completion_date": str(predicted_date),
            "daily_pace_km": round(projected_daily_pace, 3),
            "confidence_score": confidence,
            "status": status,
            "forecast_basis": forecast_basis
        }

prediction_engine = CompletionPredictionEngine()
