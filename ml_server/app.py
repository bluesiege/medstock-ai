from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score
import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ── SYNTHETIC DATA GENERATION ────────────────────────────────
# Generates realistic 180-day dispensing history per drug
# More data = better training = higher confidence
def generate_history(days=180, base=20, noise=5, trend=0.05):
    history = []
    for i in range(days):
        # Add weekly seasonality (more dispensing on weekdays)
        weekday_factor = 1.0 if i % 7 < 5 else 0.6
        # Add slight upward trend over time
        trend_factor = 1 + (trend * i / days)
        qty = base * weekday_factor * trend_factor + np.random.randint(-noise, noise)
        history.append({"day": i, "qty": max(0, round(qty))})
    return history

# ── OUTLIER REMOVAL ──────────────────────────────────────────
# Uses IQR method to remove outlier data points before training
# Outliers skew the model and reduce accuracy
def remove_outliers(history):
    quantities = [h["qty"] for h in history]
    q1 = np.percentile(quantities, 25)
    q3 = np.percentile(quantities, 75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    cleaned = [h for h in history if lower <= h["qty"] <= upper]
    outliers_removed = len(history) - len(cleaned)

    return cleaned, outliers_removed

# ── MODEL TRAINING ───────────────────────────────────────────
# Trains multiple models and returns the best one
def train_best_model(history):
    X = np.array([h["day"] for h in history]).reshape(-1, 1)
    y = np.array([h["qty"] for h in history])

    models = {
        "Linear Regression": LinearRegression(),
        "Polynomial Regression (deg 2)": Pipeline([
            ("poly", PolynomialFeatures(degree=2)),
            ("lr", LinearRegression())
        ]),
        "Random Forest": RandomForestRegressor(
            n_estimators=100, random_state=42
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.1, random_state=42
        ),
    }

    results = {}
    for name, model in models.items():
        model.fit(X, y)
        score = r2_score(y, model.predict(X))
        results[name] = {"model": model, "r2": score}

    # Pick best model by R2 score
    best_name = max(results, key=lambda k: results[k]["r2"])
    best = results[best_name]

    return best["model"], best["r2"], best_name, results

# ── CONFIDENCE SCORING ───────────────────────────────────────
def get_confidence(r2):
    if r2 >= 0.85:
        return "high"
    elif r2 >= 0.65:
        return "medium"
    else:
        return "low"

# ── FORECAST ENDPOINT ────────────────────────────────────────
@app.route("/forecast", methods=["POST"])
def forecast():
    data = request.get_json()
    drug_name = data.get("drug_name", "Unknown")
    history = data.get("history", None)

    # Use provided history or generate realistic synthetic data
    if not history:
        # Different drugs get different base demand and noise levels
        base = np.random.randint(15, 60)
        noise = np.random.randint(3, 10)
        history = generate_history(days=180, base=base, noise=noise)

    # Step 1: Remove outliers before training
    cleaned_history, outliers_removed = remove_outliers(history)

    # Fallback if too many outliers removed
    if len(cleaned_history) < 30:
        cleaned_history = history
        outliers_removed = 0

    # Step 2: Train all models, pick best
    model, r2, best_model_name, all_results = train_best_model(cleaned_history)

    # Step 3: Predict next 30 days
    last_day = len(cleaned_history)
    future_days = np.array(range(last_day, last_day + 30)).reshape(-1, 1)
    predictions = model.predict(future_days)
    predictions = [max(0, round(float(p))) for p in predictions]

    total_predicted = sum(predictions)
    suggested_reorder = round(total_predicted * 1.1)  # 10% safety buffer

    confidence = get_confidence(r2)

    # Step 4: Build algorithm comparison for frontend
    algo_comparison = [
        {
            "name": name,
            "r2": round(res["r2"], 3),
            "selected": name == best_model_name
        }
        for name, res in all_results.items()
    ]

    return jsonify({
        "drug_name": drug_name,
        "predicted_demand_30d": total_predicted,
        "suggested_reorder_qty": suggested_reorder,
        "confidence": confidence,
        "r2_score": round(r2, 3),
        "best_algorithm": best_model_name,
        "algorithm_comparison": algo_comparison,
        "daily_predictions": predictions,
        "history": [h["qty"] for h in history[-30:]],
        "outliers_removed": outliers_removed,
        "training_days": len(cleaned_history),
    })

# ── ALGORITHM COMPARISON ENDPOINT ───────────────────────────
@app.route("/compare", methods=["POST"])
def compare_algorithms():
    data = request.get_json()
    drug_name = data.get("drug_name", "Unknown")

    history = generate_history(days=180)
    cleaned, outliers_removed = remove_outliers(history)
    _, _, _, all_results = train_best_model(cleaned)

    return jsonify({
        "drug_name": drug_name,
        "algorithms": [
            {
                "name": name,
                "r2": round(res["r2"], 3),
                "confidence": get_confidence(res["r2"]),
                "explanation": {
                    "Linear Regression": "Simple, fast, explainable. Best for steady demand with no complex patterns.",
                    "Polynomial Regression (deg 2)": "Captures slight curves in demand trends. Good for seasonal variation.",
                    "Random Forest": "Ensemble of decision trees. Handles complex patterns and noise well.",
                    "Gradient Boosting": "Builds trees sequentially. Highest accuracy for irregular demand patterns."
                }.get(name, "")
            }
            for name, res in all_results.items()
        ],
        "outliers_removed": outliers_removed,
        "training_days": len(cleaned)
    })

# ── HEALTH CHECK ─────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ML server running", "algorithms": [
        "Linear Regression",
        "Polynomial Regression",
        "Random Forest",
        "Gradient Boosting"
    ]})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
