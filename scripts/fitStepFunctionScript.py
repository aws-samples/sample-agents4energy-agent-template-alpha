from pyspark.sql.functions import input_file_name, regexp_extract, col, to_date, datediff, current_date, sum, avg, when
from pyspark.sql.window import Window
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os


base_path = f's3://{s3BucketName}/global/production-data/'

production_df = spark.read.format('csv') \
    .option('header', 'true') \
    .option('inferSchema', 'true') \
    .option('recursiveFileLookup', 'true') \
    .option('basePath', base_path) \
    .load(base_path)

# First, let's see what columns we have and a sample of file_path
print("Original columns:", production_df.columns)

print("Adding file_path, api, FirstDayOfMonth, Oil(BBLS), Days P/I, DailyGasRate")
production_df = (production_df.withColumn('file_path', input_file_name()) 
    .withColumn('api', regexp_extract(col('file_path'), 'api=(\\d+)', 1)) 
    .withColumn('FirstDayOfMonth', to_date('FirstDayOfMonth', 'yyyy-MM-dd')) 
    .withColumn('Oil(BBLS)', col('Oil(BBLS)').cast('double')) 
    .withColumn('Days P/I', col('Days P/I').cast('int'))
    .withColumn('DailyGasRate', 
        when(
            (col('Days P/I').isNotNull() & (col('Days P/I') > 0) & col('Gas(MCF)').isNotNull()),
            col('Gas(MCF)') / col('Days P/I')
        ).otherwise(0.0)
    )
)
print(production_df.printSchema())

# Filter for last 5 years and remove cumulative rows
five_years_ago = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%d')
production_df = production_df.where(
    (col('FirstDayOfMonth') >= five_years_ago) & 
    (~col('Year').contains('Cum'))
)

# Calculate daily gas rate and ensure it's not null
production_df = production_df.withColumn(
    'DailyGasRate', 
    when(
        (col('Days P/I').isNotNull() & (col('Days P/I') > 0) & col('Gas(MCF)').isNotNull()),
        col('Gas(MCF)') / col('Days P/I')
    ).otherwise(0.0)
)

# Print sample of data to verify calculations
print("\nSample of production data with gas rates:")
production_df.select('api', 'FirstDayOfMonth', 'Gas(MCF)', 'Days P/I', 'DailyGasRate').show(5)

def fit_step_function(pdf):
    if len(pdf) < 2:  # Need at least 2 points to fit a step
        return pd.DataFrame({
            'api': [pdf['api'].iloc[0]],
            'initial_rate': [0.0],
            'step_date': [pdf['FirstDayOfMonth'].iloc[0]],
            'final_rate': [0.0],
            'rate_drop': [0.0],
            'fit_error': [float('inf')]
        })
    
    # Sort by date
    pdf = pdf.sort_values('FirstDayOfMonth')
    
    # Get production rates and remove any NaN values
    rates = pdf['DailyGasRate'].replace([np.inf, -np.inf], np.nan).fillna(0).values
    dates = pdf['FirstDayOfMonth'].values
    
    if np.all(rates == 0):
        return pd.DataFrame({
            'api': [pdf['api'].iloc[0]],
            'initial_rate': [0.0],
            'step_date': [dates[0]],
            'final_rate': [0.0],
            'rate_drop': [0.0],
            'fit_error': [0.0]
        })
    
    best_fit = None
    min_error = float('inf')
    
    # Try each date as a potential step point
    for i in range(1, len(dates)-1):
        # initial_rate = np.mean(rates[:i])
        # final_rate = np.mean(rates[i:])
        initial_rate = np.median(rates[:i])
        final_rate = np.median(rates[i:])
        step_date = dates[i]
        rate_drop = initial_rate - final_rate
        
        # Calculate error
        predicted = np.where(dates < step_date, initial_rate, final_rate)
        error = np.sum((rates - predicted) ** 2)
        
        if error < min_error:
            min_error = error
            best_fit = {
                'api': [pdf['api'].iloc[0]],
                'initial_rate': [float(initial_rate)],
                'step_date': [step_date],
                'final_rate': [float(final_rate)],
                'rate_drop': [float(rate_drop)],
                'fit_error': [float(error)]
            }
    
    if best_fit is None:  # If no fit was found
        rate_drop = float(rates[0] - rates[-1])
        best_fit = {
            'api': [pdf['api'].iloc[0]],
            'initial_rate': [float(rates[0])],
            'step_date': [dates[0]],
            'final_rate': [float(rates[-1])],
            'rate_drop': [rate_drop],
            'fit_error': [float('inf')]
        }
    
    return pd.DataFrame(best_fit)

# Group by API and fit step function
step_function_fit_df = production_df.groupBy('api').applyInPandas(
    fit_step_function, 
    schema="""
        api string,
        initial_rate double,
        step_date date,
        final_rate double,
        rate_drop double,
        fit_error double
    """
)

# Show results sorted by rate drop (largest drops first)
print("\nStep Function Fits for Each Well (Gas Rates), Sorted by Largest Rate Drops:")
step_function_fit_df.orderBy(col('rate_drop').desc()).show(10, truncate=False)

# Create data directory if it doesn't exist
data_dir = 'data'
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

# Save the step function fits to CSV
csv_path = os.path.join(data_dir, 'step_function_fit_df.csv')
step_function_fit_df.toPandas().to_csv(csv_path, index=False)
print(f"\nStep function fits saved to: {csv_path}")

# # Get the top 5 wells with highest rate drops
# top_wells = step_function_fit_df.orderBy(col('rate_drop').desc()).limit(5).collect()

# # Create subplots, 3 rows and 2 columns (one extra subplot that we won't use)
# fig = make_subplots(rows=3, cols=2, subplot_titles=[f"Well {well['api']}" for well in top_wells])

# # Plot each well's data
# for i, well in enumerate(top_wells, 1):
#     # Calculate row and column for subplot
#     row = ((i-1) // 2) + 1
#     col = ((i-1) % 2) + 1
    
#     # Get the production data for this well
#     well_data = production_df.filter(col('api') == well['api']) \
#         .select('FirstDayOfMonth', 'DailyGasRate') \
#         .orderBy('FirstDayOfMonth') \
#         .toPandas()
    
#     # Plot daily gas rates as red dots
#     fig.add_trace(
#         go.Scatter(
#             x=well_data['FirstDayOfMonth'],
#             y=well_data['DailyGasRate'],
#             mode='markers',
#             name=f'Daily Rate (Well {well["api"]})',
#             marker=dict(color='red', size=6),
#             showlegend=False
#         ),
#         row=row, col=col
#     )
    
#     # Add step function
#     step_dates = [well_data['FirstDayOfMonth'].iloc[0], well['step_date'], 
#                   well['step_date'], well_data['FirstDayOfMonth'].iloc[-1]]
#     step_rates = [well['initial_rate'], well['initial_rate'], 
#                   well['final_rate'], well['final_rate']]
    
#     fig.add_trace(
#         go.Scatter(
#             x=step_dates,
#             y=step_rates,
#             mode='lines',
#             name=f'Step Function (Well {well["api"]})',
#             line=dict(color='black', width=2),
#             showlegend=False
#         ),
#         row=row, col=col
#     )

# # Update layout
# fig.update_layout(
#     title="Gas Production Rate Step Functions for Top 5 Wells with Largest Rate Drops",
#     height=1200,  # Make the figure taller
#     width=1000,   # Make the figure wider
#     template="simple_white",
#     showlegend=False
# )

# # Update all x-axes
# for i in range(1, 6):
#     row = ((i-1) // 2) + 1
#     col = ((i-1) % 2) + 1
#     fig.update_xaxes(title_text="Date", row=row, col=col)
#     fig.update_yaxes(title_text="Daily Gas Rate (MCF/day)", row=row, col=col)

# # Create plots directory if it doesn't exist
# plots_dir = 'plots'
# if not os.path.exists(plots_dir):
#     os.makedirs(plots_dir)

# # Save the figure as HTML
# current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
# plot_filename = os.path.join(plots_dir, f'top_5_gas_drops_{current_time}.html')
# fig.write_html(plot_filename)
# print(f"Plot saved to: {plot_filename}")

# # Show the plot
# fig.show()
# Sample of the data
'''
+---------------+--------+--------------------+-----+---------+--------+-----------+--------+--------------------+----------+
|FirstDayOfMonth|    Year|                Pool|Month|Oil(BBLS)|Gas(MCF)|Water(BBLS)|Days P/I|           file_path|       api|
+---------------+--------+--------------------+-----+---------+--------+-----------+--------+--------------------+----------+
|     1992-12-01|1992 Cum|[72319] BLANCO-ME...|  Dec|      482|  696066|          0|      99|s3://amplify-digi...|3003921673|
|     1992-12-01|1992 Cum|[77440] GOBERNADO...|  Dec|        0|  222989|          0|      99|s3://amplify-digi...|3003921673|
|     1993-01-01|    1993|[72319] BLANCO-ME...|  Jan|        0|    3645|          0|      31|s3://amplify-digi...|3003921673|
|     1993-02-01|    1993|[72319] BLANCO-ME...|  Feb|        0|     142|          0|      28|s3://amplify-digi...|3003921673|
|     1993-03-01|    1993|[72319] BLANCO-ME...|  Mar|        0|    7417|          0|      31|s3://amplify-digi...|3003921673|
+---------------+--------+--------------------+-----+---------+--------+-----------+--------+--------------------+----------+
only showing top 5 rows
'''

