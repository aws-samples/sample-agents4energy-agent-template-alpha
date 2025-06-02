# Import required libraries
import pandas as pd
import numpy as np
from scipy.optimize import curve_fit
import plotly.graph_objs as go
import plotly.io as pio
import warnings
import os
import json

present_value_discount_rate=0.1
gas_price_MCF=3
operating_cost_USD_per_year=50000
# Read production data
production_df = pd.read_csv(path_to_production_data)

# Convert Date column to datetime
production_df['Date'] = pd.to_datetime(production_df['Date'])

# Filter and clean data
production_df = production_df[production_df['Date'] <= pd.to_datetime(production_drop_date)]
production_df = production_df[production_df['GasProduced'] > 0]  # Remove zero or negative values



t_years = ((production_df['Date'] - production_df['Date'].min()).dt.days / 365.25).values

# Hyperbolic Decline Function
def hyperbolic_decline(t, qi, di, b):
    return qi * (1 + b * di * t) ** (-1/b)

# General formula for time to reach a specific rate in hyperbolic decline
def time_to_rate(qi, di, b, target_rate):
    return ((qi/target_rate)**b - 1)/(b * di)

def get_qi_from_terminal_rate(di, b, target_rate, t_terminal):
    t_terminal_days = (pd.to_datetime(t_terminal) - pd.to_datetime(production_df['Date'].min())).days
    t_terminal_years = t_terminal_days / 365.25
    qi = target_rate * (1 + b * di * t_terminal_years) ** (1/b)
    return qi

def hyperbolic_decline_with_terminal_rate(t, di, b):
    # Calculate initial rate that will result in final_production_rate_MCFD at t = max(t_years)
    # Find the number of years between the min of production_df['Date'] and production_drop_date
    # t_terminal_days = (pd.to_datetime(production_drop_date) - pd.to_datetime(production_df['Date'].min())).days
    # t_terminal_years = t_terminal_days / 365.25
    qi = get_qi_from_terminal_rate(di, b, initial_production_rate_MCFD, production_drop_date)
    # print(f"Initial Production Rate (qi):",qi," MCF/Day")
    return qi * (1 + b * di * t) ** (-1/b)

def main():
    # Prepare data for curve fitting
    gas_rates_MCFD = production_df['GasProduced']/production_df['Days']
    gas_rates_MCFD[(gas_rates_MCFD.isna() | np.isinf(gas_rates_MCFD))]=0

    # Weight recent points more heavily (x20)
    n = len(t_years)
    weights = np.linspace(0.05, 1, n)**2 * 20

    # Curve Fitting with bounds and weighted fitting
    popt, pcov = curve_fit(
        hyperbolic_decline_with_terminal_rate, 
        t_years, 
        gas_rates_MCFD, 
        p0=[0.3, 0.5],  # Initial guess
        bounds=(
            [0, 0],  # Lower bounds
            [1.0, 2.0]  # Upper bounds
        ),
        sigma=1/weights,  # Weighting
        absolute_sigma=True
    )

    # Unpack optimized parameters
    di_opt, b_opt = popt
    qi_opt = get_qi_from_terminal_rate(di_opt, b_opt, initial_production_rate_MCFD, production_drop_date)

    print(f"Optimized Hyperbolic Decline Parameters:")
    print(f"Initial Production Rate (qi): {qi_opt:,.2f} MCF/Day")
    print(f"Annual Decline Rate (di): {di_opt:.4f}")
    print(f"Annual Decline Exponent (b): {b_opt:.4f}\n")

    # Calculate the economic life of the well based on the decline model
    economic_limit_producition_rate_MCFD=operating_cost_USD_per_year/365.25/gas_price_MCF # Assume $50k/yr operating cost and $3/MCF gas sales    
    economic_life_years = min(50, time_to_rate(qi_opt, di_opt, b_opt, economic_limit_producition_rate_MCFD))
    print(f"Economic Life of the Well: {economic_life_years:,.2f} years")

    # Generate prediction points
    # t_pred = np.linspace(0, economic_life_years + 1, 100)
    t_pred = np.arange(0, int(economic_life_years) + 1)
    t_economic_evaluation_years = t_pred[int(max(t_years)):]
    # t_economic_evaluation_years = np.arange(int(max(t_years)), int(economic_life_years) + 1)

    gas_rate_pred_MCFM = hyperbolic_decline(t_pred, qi_opt, di_opt, b_opt)*365.25/12
    # Calculate initial rate that will result in final_production_rate_MCFD at t = max(t_years)
    qi_lower = final_production_rate_MCFD * (1 + b_opt * di_opt * int(max(t_years))) ** (1/b_opt)
    gas_rate_pred_MCFM_lower = hyperbolic_decline(t_pred, qi_lower, di_opt, b_opt)*365.25/12

    # Residual Analysis
    residuals = gas_rates_MCFD - hyperbolic_decline(t_years, qi_opt, di_opt, b_opt)
    print(f"Mean Residual: {np.mean(residuals):,.2f} MCF/Day")
    # Financial Analysis

    # Calculate the present value of the fitted decline curve, starting from the production drop date

    present_value_of_fitted_decline_curve = sum([
        gas_price_MCF * gas_rate_MCFM * 12 * np.exp(-present_value_discount_rate * i) 
        for i, gas_rate_MCFM in enumerate(gas_rate_pred_MCFM[int(max(t_years)):])
        ])
    print(f"Present Value of the Fitted Decline Curve: ${present_value_of_fitted_decline_curve:,.2f}")
    # Calculate the present value of the production drop
    present_value_of_lower_production_rate = sum([
        gas_price_MCF * gas_rate_MCFM * 12 * np.exp(-present_value_discount_rate * i) 
        for i, gas_rate_MCFM in enumerate(gas_rate_pred_MCFM_lower[int(max(t_years)):])
        ])
    print(f"Present Value of the Production Drop: ${present_value_of_lower_production_rate:,.2f}")
    present_value_of_production_wedge = present_value_of_fitted_decline_curve - present_value_of_lower_production_rate
    print(f"Present Value of the Production Wedge: ${present_value_of_production_wedge:,.2f}")

    # Save parameters to JSON file
    parameters_dict = {
        "decline_curve_parameters": {
            "initial_production_rate_mcf_per_day": float(qi_opt),
            "annual_decline_rate": float(di_opt),
            "decline_exponent": float(b_opt),
            "economic_life_years": float(economic_life_years)
        },
        "economic_parameters": {
            "present_value_fitted_decline_curve_usd": float(present_value_of_fitted_decline_curve),
            "present_value_production_drop_usd": float(present_value_of_lower_production_rate),
            "present_value_production_wedge_usd": float(present_value_of_production_wedge),
            "gas_price_mcf": float(gas_price_MCF),
            "operating_cost_usd_per_year": float(operating_cost_USD_per_year)
        }
    }

    # Create output directory if it doesn't exist
    os.makedirs('intermediate', exist_ok=True)

    # Save to JSON file with well API number in filename
    json_filename = f'intermediate/well_{well_api_number}_parameters.json'
    with open(json_filename, 'w') as f:
        json.dump(parameters_dict, f, indent=4)

    # Plot the actual and predicted data
    plot_df = pd.DataFrame({
        'Date': production_df['Date'].min() + pd.to_timedelta(t_pred * 365.25, 'D'),
        'PredictedGasRate': gas_rate_pred_MCFM,
        'PredictedGasRateLower': gas_rate_pred_MCFM_lower
    })

    # Filter plot_df to only show predictions after historical data
    plot_df_future = plot_df.iloc[int(max(t_years)):]

    # Plotly interactive plot
    fig = go.Figure()

    # Scatter plot of actual data points
    fig.add_trace(go.Scatter(
        x=production_df['Date'], 
        y=production_df['OilProduced'], 
        mode='markers', 
        name='Actual Oil Production', 
        marker=dict(color='green', size=5)
    ))

    fig.add_trace(go.Scatter(
        x=production_df['Date'], 
        y=production_df['GasProduced'], 
        mode='markers', 
        name='Actual Gas Production', 
        marker=dict(color='red', size=5)
    ))

    fig.add_trace(go.Scatter(
        x=production_df['Date'], 
        y=production_df['WaterProduced'], 
        mode='markers', 
        name='Actual Water Production', 
        marker=dict(color='blue', size=5)
    ))

    # Line plot of predicted decline curve
    fig.add_trace(go.Scatter(
        x=plot_df['Date'], 
        y=plot_df['PredictedGasRate'], 
        mode='lines', 
        name='Hyperbolic Decline Curve', 
        line=dict(color='grey', dash='dot')
    ))

    # Add lower production rate curve and fill area between curves
    fig.add_trace(go.Scatter(
        x=plot_df_future['Date'],
        y=plot_df_future['PredictedGasRateLower'],
        mode='lines',
        name='Reduced Production Rate',
        line=dict(color='grey', dash='dot')
    ))

    # Add filled area between curves
    fig.add_trace(go.Scatter(
        x=plot_df_future['Date'].tolist() + plot_df_future['Date'].tolist()[::-1],
        y=plot_df_future['PredictedGasRate'].tolist() + plot_df_future['PredictedGasRateLower'].tolist()[::-1],
        fill='toself',
        fillcolor='rgba(128, 128, 128, 0.2)',
        line=dict(color='rgba(255,255,255,0)'),
        name='Production Loss',
        showlegend=True
    ))

    # Add step function to show production drop
    days_per_month = 365.25/12  # Average days per month
    initial_rate_monthly = float(initial_production_rate_MCFD) * days_per_month
    final_rate_monthly = float(final_production_rate_MCFD) * days_per_month

    step_dates = [
        pd.to_datetime(production_drop_date) - pd.Timedelta(weeks=52),
        pd.to_datetime(production_drop_date),
        pd.to_datetime(production_drop_date),
        pd.to_datetime(production_drop_date) + pd.Timedelta(weeks=52)
    ]
    step_rates = np.array([initial_rate_monthly, initial_rate_monthly, final_rate_monthly, final_rate_monthly])

    fig.add_trace(go.Scatter(
        x=step_dates,
        y=step_rates,
        mode='lines',
        name='Production Drop',
        line=dict(color='black', width=2),
        hoverinfo='x+y'
    ))

    # Update layout
    fig.update_layout(
        title=f'Well {well_api_number}, Pool {pool} - Gas Production Hyperbolic Decline',
        xaxis_title='Date',
        yaxis_title='Gas Production (MCF/Month)'
    )

    fig.update_yaxes(type='log')

    # Save the plot
    fig.write_html(f'plots/{well_api_number}_hyperbolic_decline.html')

    # except Exception as e:
    #     print(f"Error in hyperbolic decline analysis: {e}")
        
    # Residual Analysis
    import scipy.stats as stats

    # Normality test for residuals
    _, p_value = stats.normaltest(residuals)
    print(f"Residuals Normality Test p-value: {p_value}")
    print(f"Residuals Mean: {np.mean(residuals):.4f}")
    print(f"Residuals Standard Deviation: {np.std(residuals):.4f}")

if (production_df.shape[0] > 10):
    main()
else:
    # Save to JSON file with well API number in filename
    json_filename = f'intermediate/well_{well_api_number}_parameters.json'
    with open(json_filename, 'w') as f:
        json.dump({"no_fit": True}, f, indent=4)
    print('Production DF does not contain 10 rows')