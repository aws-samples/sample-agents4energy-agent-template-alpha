# Building AI Agents for Energy Sector Applications
## A Practical Workshop for Petroleum Engineers

This guide will walk you through building intelligent AI agents using LangGraph and AWS Amplify, with specific examples and applications relevant to the energy sector. As a petroleum engineer, you'll learn how these technologies can help you analyze data, optimize operations, and make better decisions.

## Prerequisites ( AWS workshops will provide you with an IDE with these steps completed )

Before beginning this workshop, make sure you have:
- An AWS account with appropriate permissions
- Node.js 18.x or later installed
- AWS CLI configured on your machine
- Clone the git repo located at https://github.com/aws-samples/sample-agents4energy-agent-template-alpha
- Install the repo dependencies using the bash command `npm install`

## Lab 1 - Deploy the "sandbox" development enviornment
When using AWS Amplify to develop and host applications, you can provide developers with their individual "sandbox" environments which lets them rapidly iterate on front and back end changes without impacting the produciton deployment. When they're ready, they can stage changes into the produciton CI/CD pipeline by commiting them to the git repo.

In this workshop, we'll be developing in the sandbox environment to become familiar with the patters behind Agents For Energy.

The first step is to deploy the sandbox environment. Begin the deployment process using the bash command `npx ampx sandbox`. You may be prompted to bootstrap the "cdk" environment. If so, login to the AWS account, run `npx ampx sandbox` again, and follow the prompts to deploy the bootstrap enviroinment.

The sandbox should deploy in less than 10 minutes.

## Lab 2 - Interact with the application

Now you can start the local dev server to host the front end. Send the command `npm run dev` to spin up the local dev server.

### If you're running this event in an AWS workshop, or in another code-server environment
You'll be routed to a page with a url that looks something like this: `https://<my_cloudfront_id>.cloudfront.net/proxy/3000`. Because we're hosting a react app, we need to use the absproxy feature instead of the proxy feature, so correct the url to look like this `https://<my_cloudfront_id>.cloudfront.net/absproxy/3000`

In a web browser window, navigate to the url of the development server (`localhost:3000` if you're developing locally). Click the "Login" button and create an account. You'll be asked to verify your email address.

Now click the "Create" button on the top navigation bar. You'll see a few example prompts which will have the agent generate data, analyze the data, and create a report based on what it found. Modify these prompts to fit a use case you have in mind, and click the "Send" button.

Now the agent will proccess the scenario you presented and prepare a graphics rich report for you.

### Agentic Tool Calling

The agent you're speaking with uses the [ReAct framework](https://arxiv.org/abs/2210.03629) where when queried, the agent will either respond to the user, or call a "tool", and use the tool's response when responding to the user. To see the tool call messages, click the small icon which looks like a head on the top right corner of the chat window. Now you'll see messages with a box labeled "Tool Calls" on the bottom of some messages.

Each tool has a name (shown next to the gear icon) and accepts arguments created by the agent. When the agent calls a tool, those arguments are presented to the function body, which processes the tool call. 

Tool responses are shown below the messages with the tool call. The agent will see a JSON object with the same content as the tool response message. Some of the tool response messages are interactive, and will let you interact with a plot, or open a file.

### Chat Session Files

The agent can create files in S3 associated with this chat session. Click on the folder button on the top right of the chat box to open the chat session files. As the agent processes the query, it will often create data files, plots, intermediate files to track progress towards completing a workflow, reports, and scripts to run in the programming execution environment. You can upload files here and then ask the agent about them.

## Lab 3 - Explore existing tools

The agent in this demo come with a set of tools which allow it to analyze data and create graphic rich reports. Among these are a serverless PySpark execution enviornment provided with Amazon Athena, and tools to create and update files in Amazon Simple Storage Service (S3). 

### PySpark tool
Code execution allows agents to execute complex analytic workloads, and to create plots with lots of data points. Amazon Athena's PySpark execution envionment allows the agent to execute big data analytic workloads which automatically scale out based on the query's complexity. In this way the agent can process massive volumes of data. Any plots created in this envornment are saved as part of the chat session's files.

With the "Chain of thought" mode activated, find a message with "pysparkTool" in the tool call box. Click the "Show More" button to see the script that the agent wrote. In the next box, you'll see the stdout (and stderr if there was an error). Errors here are to be expected. The agent will see the error, and likely change the script in some way to address the error.

If you open the chat session files, and navigate to the "scripts" directory, you'll see the script the agent wrote, along with code which sets up the chat session. You can copy this code into the AWS Console's Amazon Athena Notebook page to run the code there too (and modify it).

### S3 File Management tools
The agent is able to read and write files associated with the chat session. Find a message with "writeFile" in the tool call box. The aruments here are the file name and the content of the file. The next message should say "File saved successfully" and offer a button which lets you open the file in a new window.

## Lab 4 - Create custom tool
Now let's add a new feature to the agent. There are lots of business processes which agents struggle with out of the box and require a custom tool to provide the necessary context. As an example, lets see if the agent can accuratly caluclate the permeability an an underground reservior. Try asking the agent this question: `What is the permeability of 30% porosity sandstone with 1mm average grain size?`. The correct answer is 367.35 mD (using the Kozeny–Carman equation). The agent will often give highly variable, and incorrect answers. To address this, we can create a custom tool which calculates permebility based on porosity, rock type, and average grain size.

1. Navigate to the file located at `amplify/functions/tools/customWorkshopTool.ts`
    1. In this file, you'll see `permeabilityCalculatorSchema` which defines the schema of the arguments to the tool call. When the agent calls this tool, it will fill out arguments based on this schema.
    1. Below that we have the function logic which calculates the permeability using the Kozeny-Carmen equation.
    1. Can you see how to update this function to accept "chalk" as a rock type with a constant value of 500?
1. Navigate to the file located at `amplify/functions/reActAgent/handler.ts`
    1. This is the AWS Lambda handler code which hosts the LangGraph agent.
    1. Find the line `// import { permeabilityCalculator } from "../tools/customWorkshopTool";`. In typescript, `//` means the line is commented out. Uncomment this line to import the permeabilityCalculator tool
    1. Now find the line with the text `const agentTools = [`. Here is where we define which tools the agent has access to. Add the permeabilityCalculator tool to this list of tools.
    1. If you still have the terminal running the command `npx ampx sandbox`, the changes you make will automatically be deployed to your sandbox environment when you save the file.
    1. Ask the agent again `What is the permeability of 30% porosity sandstone with 1mm average grain size?` and see if it responds with the correct answer.

## Lab 5 - Create custom UI element

If you activate chain of thought mode, you'll see that the tool response to the permeabilityCalculator tool is rendered as a JSON object with the tool's response. We can create custom UI elements to render this information in a more user friendly way, so that the user can quickly understand the tool's response.

1. Navigate to the file `src/components/ChatMessage.tsx`
1. Find the line with the text `// case 'permeabilityCalculator':`
1. Uncomment out this line and the one below it.
1. Re-fresh the chat session and check out the new tool response message. This component has the same information as the JSON object, but is easier for a user to understand.

