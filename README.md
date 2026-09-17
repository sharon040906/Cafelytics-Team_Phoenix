# ☕ Cafelytics

### Explainable Demand Forecasting & Inventory Decision Support for Cafés

Cafelytics is a web-based inventory intelligence dashboard designed to help café managers make better stocking decisions using historical sales data.

Instead of simply predicting demand, Cafelytics answers three practical questions:

> **How much should I stock?**  
> **Why is that the recommendation?**  
> **What happens if demand or available stock changes?**

The system combines demand forecasting, visual analytics, risk and cost analysis, scenario simulation, and an interactive assistant into one dashboard.

---

## 🚀 Key Features

### 📈 Demand Forecasting

Cafelytics estimates the expected demand for each menu item using historical sales patterns.

The forecasting process considers:

- Historical average demand
- Recent 7-day average
- Day-of-week demand patterns
- Historical demand variability
- Recent demand trend

The basic forecasting approach is:

```text
Predicted Demand
= Recent 7-Day Average × Day-of-Week Adjustment Factor
