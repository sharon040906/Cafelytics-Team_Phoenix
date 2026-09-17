# ☕ Cafelytics

Project Overview

Cafelytics is an intelligent café inventory management and demand forecasting dashboard designed to help café owners and managers make better stocking decisions using historical sales data.

Managing inventory in a café can be challenging. If a café stocks too little, popular products may run out, resulting in missed sales and dissatisfied customers. If it stocks too much, products may remain unsold, leading to wastage, unnecessary expenses, and reduced profits.

Traditional inventory management often depends on manual estimation or personal experience. Cafelytics aims to support these decisions through data-driven demand forecasting, risk analysis, visual analytics, and interactive what-if scenarios.

Instead of simply showing a predicted sales number, Cafelytics focuses on three important questions:

How much demand can we expect?
Why is this demand being predicted?
What could happen if demand or available stock changes?

The goal is to make inventory planning more understandable, transparent, and practical for café businesses.

🎯 Problem Statement

Cafés need to maintain the right amount of inventory every day. However, demand for products such as coffee, tea, sandwiches, and pastries can change depending on customer preferences, weekdays, recent sales trends, and other factors.

Poor demand estimation can lead to:

Understocking: Not having enough products to satisfy customer demand.
Overstocking: Purchasing more inventory than required.
Product wastage: Unsold or perishable products becoming unusable.
Missed revenue: Losing potential sales when products are unavailable.
Unclear decision-making: Managers not knowing why a particular stocking recommendation was made.

A café needs a solution that does more than display historical sales. It should help users understand expected demand, identify possible risks, and evaluate different inventory decisions.

💡 Proposed Solution

Cafelytics provides a centralized dashboard where users can analyze historical sales data and receive inventory recommendations for different café products.

The system uses a transparent statistical forecasting approach to estimate upcoming demand. It considers:

Historical product sales
Recent sales performance
Day-of-week patterns
Average demand
Variation in sales
Stocking limits
Approximate overstocking and understocking costs

The dashboard then presents these results through charts, recommendation cards, risk indicators, and an interactive What-if Lab.

Cafelytics also includes BrewBuddy, a built-in assistant that provides rule-based explanations and answers questions about the available dashboard data.

🚀 Key Features
1. 📊 Demand Forecasting

The demand forecasting module estimates how many units of a selected product may be required for the next planning day.

The forecast uses historical sales information and recent demand trends.

Factors considered:
Historical average sales
Average sales from the most recent observations
Day-of-week demand patterns
Historical demand variation
Number of previous observations available

For example:

If coffee sales have increased during recent days and Mondays historically show strong demand, Cafelytics may recommend stocking a higher quantity for the upcoming Monday.

The system displays the forecasted quantity along with supporting information so that users can understand how the recommendation was calculated.

Important note

The current prototype uses a transparent statistical forecasting method, rather than a trained machine learning model. This makes the initial system easier to understand, explain, and validate.

2. 🧠 Explainable Recommendations

One of the main objectives of Cafelytics is to avoid giving users unexplained predictions.

Instead of displaying only:

Recommended stock: 40 units

The system provides an explanation such as:

Demand is increasing compared with the historical average. The system recommends stocking approximately 40 units for the selected day.

The recommendation may also include:

Recent demand trend
Historical average comparison
Forecast confidence
Number of relevant historical observations
Possible understocking or overstocking concerns

This approach helps café managers understand the reasoning behind a recommendation instead of blindly following a prediction.

3. 📈 Visual Analytics

The Visual Analytics section presents sales and demand information through graphical representations.

Charts make it easier to identify patterns that may not be immediately visible in raw data.

Current analytics include:
Recent sales trends
Historical demand comparisons
Product-level sales information
Understocking, recommended-stock, and overstocking comparisons
Recent average demand
Peak sales days
Planning-related insights

For example, a user may identify that a product has experienced increased sales during the last few days or that certain weekdays consistently generate higher demand.

These visual insights can support better planning and help users make informed inventory decisions.

4. ⚠️ Risk and Cost Analysis

Inventory decisions involve different types of risks.

Stocking too little may result in lost sales, while stocking too much may increase wastage and unnecessary inventory costs.

Cafelytics includes a risk and cost analysis module that compares three stocking scenarios:

Understocking

The system estimates the impact of stocking less than the recommended quantity.

Potential consequences include:

Product shortages
Missed sales opportunities
Lower customer satisfaction
Estimated lost revenue
Recommended Stock

This scenario uses the system's forecasted demand as the baseline recommendation.

It is intended to provide a balanced reference point for comparing the other stocking options.

Overstocking

The system estimates the possible cost of stocking more products than the expected demand.

Potential consequences include:

Unsold inventory
Product wastage
Increased holding costs
Reduced operational efficiency

The calculations use configurable assumptions such as product margin and wastage-related cost. These estimates are intended for decision support and may not represent the exact financial performance of a real café.

5. 🔬 What-if Lab

The What-if Lab allows users to experiment with different inventory situations without changing the original forecast.

This helps users understand how recommendations may change under different conditions.

Supported scenarios include:
Demand Adjustment

Users can apply a percentage increase or decrease to the baseline forecast.

For example:

Demand increases by 20%
Demand decreases by 15%
Demand remains unchanged

The system then calculates an adjusted demand value based on the selected percentage.

Stock Cap Scenario

Users can specify a maximum number of units that can be stocked.

Cafelytics compares the stock limit with the predicted demand and displays:

Possible shortfall
Estimated lost-sales exposure
Possible surplus
Difference between available stock and expected demand

For example:

If predicted demand is 50 units but the stock limit is 35 units, the system identifies a possible shortage of 15 units.

Unsupported scenarios

The current prototype does not calculate weather-based or festival-based demand changes because those factors are not yet included in the available dataset and forecasting model.

The system provides a transparent fallback instead of pretending to have calculated unsupported conditions.

6. 💬 BrewBuddy Assistant

BrewBuddy is the built-in café inventory assistant included in Cafelytics.

It helps users understand information available in the dashboard through simple, rule-based responses.

Users can ask questions related to:

Product forecasts
Stock recommendations
Demand trends
Understocking
Overstocking
What-if scenarios
Inventory-related insights

For example, a user may ask:

Which product has the highest expected demand?

BrewBuddy can use the available dashboard information to provide a relevant response.

Current implementation

The current BrewBuddy assistant is rule-based and locally implemented. It does not require an external large language model or API connection.

This approach provides a reliable and lightweight assistant for the prototype.

Future development

A future version could integrate a large language model with controlled application functions such as:

Retrieving a product forecast
Running a demand adjustment
Checking inventory risk
Comparing stocking scenarios
Explaining analytical results

In such a system, the language model would explain the results, while numerical calculations would continue to be performed by the application.

7. 🖼️ Product Image Upload

Cafelytics allows users to upload product images for visual reference.

This feature helps users associate inventory data with the corresponding café product.

For example, users can upload images of:

Coffee
Tea
Sandwiches
Pastries
Cakes
Other café products

The image upload feature is currently intended for presentation and product identification. It does not directly influence the forecasting calculations.

8. ☕ Multiple Café Products

The dashboard supports multiple café menu items rather than focusing on a single product.

This allows users to switch between products and compare their demand patterns and inventory requirements.

The menu includes different categories of café products, allowing the system to demonstrate how demand and stocking recommendations may vary across items.

Each product can have its own:

Historical sales data
Forecast
Recent demand trend
Risk analysis
Cost assumptions
What-if scenarios
⚙️ How Cafelytics Works

The overall workflow of Cafelytics can be summarized as follows:

Historical Sales Data
        ↓
Data Processing
        ↓
Demand Pattern Analysis
        ↓
Forecast Calculation
        ↓
Risk and Cost Evaluation
        ↓
Interactive Dashboard
        ↓
Inventory Decision Support
Step 1: Data Collection

The system reads product information and historical sales data from CSV files.

The sales data contains information such as:

Transaction date
Product name
Quantity sold
Price-related information
Other available sales details
Step 2: Data Processing

The system organizes sales records according to products and dates.

It calculates relevant values such as:

Historical average
Recent average
Sales variation
Day-of-week patterns
Number of available observations
Step 3: Forecast Calculation

The system combines recent demand with day-of-week patterns to estimate upcoming product demand.

The forecast is then rounded to a practical quantity that can be used for inventory planning.

Step 4: Recommendation Generation

The calculated forecast is converted into a stocking recommendation.

The dashboard also generates explanations based on:

Demand growth or decline
Historical comparison
Forecast confidence
Available historical data
Step 5: Risk and Scenario Analysis

The recommendation is evaluated against understocking and overstocking situations.

Users can also modify demand assumptions or apply stock limits through the What-if Lab.

Step 6: Dashboard Presentation

The final information is presented through:

Summary cards
Product selectors
Charts
Recommendation panels
Risk indicators
BrewBuddy responses
🧮 Forecasting Methodology

The current forecasting approach is designed to be simple, transparent, and understandable.

The system calculates:

Historical Average

The average sales quantity across available historical records.

This provides a general understanding of the product's normal demand.

Recent Average

The average sales quantity from the most recent observations.

This helps the system identify whether recent demand is higher or lower than the historical average.

Day-of-Week Factor

The system analyzes how demand varies across different weekdays.

For example, a product may sell more on weekends than on weekdays. The system uses available historical weekday patterns to adjust the forecast.

Demand Forecast

The predicted demand is calculated using recent demand and the relevant day-of-week factor.

The forecast is supported by the historical variation in sales, which is also used to communicate the uncertainty of the recommendation.

Confidence Indicator

The system displays a confidence label based on the number of relevant historical observations.

The current labels include:

High confidence
Medium confidence
Low confidence

These labels represent the amount of available historical evidence. They should not be interpreted as formal statistical probability values.

🏗️ Technology Stack
Frontend
HTML5
CSS3
JavaScript
Responsive dashboard layout
Interactive charts
Browser-based user interactions
Data Processing
JavaScript-based data processing
CSV data files
Statistical calculations
Forecasting logic
Visualization
Custom dashboard charts
Trend visualizations
Product-level comparisons
Risk and cost displays
Assistant
JavaScript-based rule-driven BrewBuddy assistant
Local responses based on dashboard data

The current version is designed to run as a frontend-based prototype without requiring a separate backend server.
