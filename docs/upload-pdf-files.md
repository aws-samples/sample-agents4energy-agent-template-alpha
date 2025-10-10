
Here are steps to create a user in the application, update the large language model, and to add unstructured data to the application.
 
Create a user in AWS Amplify
Navigate to the AWS Amplify page in the AWS Console: https://us-east-1.console.aws.amazon.com/amplify/apps
Click on the application (“sample-agents4energy-agent-template-alpha”)
Click on the deployed branch (“no-guest-access”)
Click “Authentication”
image001.png
Click “Create user”
image002.png
Fill out user information and share the temporary password with the user.
 
 
Update the Large Language Model used by the app
We’ll use the most recent model from Anthropic to improve performance.
Start from step 3 of the “Create a user in AWS Amplify” list.
Click on “Functions”
image003.png
Click on the function with “reActAgentlambda” in the function name
image004.png
Click “View in Lambda:
image005.png
Click “Configuration”
image006.png
Scroll down and click “Environment variables”
image007.png
Click “Edit”
Change the “AGENT_MODEL_ID” value to be “us.anthropic.claude-sonnet-4-20250514-v1:0”
image008.png
Scroll down and click “Save”.
Done! You can experiment with other models from the model catalogue here: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/model-catalog
Some models require you to prefix the model_id with “us.” This uses a “regional inference profile” which improves latency.
 
 
Add unstructured data to the application
Start from step 3 of the “Create a user in AWS Amplify” list
Click “Storage”
image009.png
Click “Create folder” and create a folder with the name “global”.
image010.png
Click on the newly created global folder
Create a folder named “well-files”
image011.png
Click on the newly created “well-files” folder.
Click “Upload” and select the relevant pdf documents.
Wait 15 minutes.
Navigate to the application Renaissance deployed (https://no-guest-access.d14p543cy4s7og.amplifyapp.com/)
Log in (first complete the steps in the “Create a user in AWS Amplify” list)
Click “Create” on the top left of the screen.
Here are a few example prompts to try:
Which wells do you have access to in the global/well-files directory?
Analyze files located in the global/well-files directory to assess the quality of each producing reservoir. Compare reservoir properties in the AHIA and AFREMO fields against those of common reservoirs worldwide. Generate a detailed report with visualizations that highlight key differences and insights.
In the upstream database, look at the column names and number of rows for each table, and make a report which explains what data is available in each table. Include plots of the data for each table.
In the upstream database, use the well header table and the geology table to make a contour plot showing reservoir thickness vs extend for each reservoir in the AHIA field. For each producing reservoir, estimate the reservoir volume. Look in the `global/well-files` directory for information about reservoir properties.
In the upstream database, look at the production data table and make a report with plots explaining the available data. Focus on what would be important to an oil and gas company.
 
