# Lab 1: Setting Up Your Development Environment

Welcome to the first lab! Here you'll set up your development environment for building AI agents with LangGraph and AWS Amplify. By the end of this lab, you'll have a fully configured development environment ready for building AI agents.

## Prerequisites

Ensure you have the following installed on your machine:

```bash
# Verify Node.js (18.x or later)
node --version

# Verify AWS CLI configuration
aws configure list
```

If any of these checks fail, please install the missing components before proceeding.

## Step 1: AWS Configuration

1. In the AWS Console, locate the environment variables containing your AWS access credentials
2. Copy these environment variables into your terminal session
3. Verify your configuration:
   ```bash
   aws sts get-caller-identity
   ```
   This should return your AWS account information without errors.

## Step 2: Project Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/your-repo/amplify-langgraph-template
   cd amplify-langgraph-template
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Step 3: Deploy Sandbox Environment

1. Launch the Amplify sandbox environment:
   ```bash
   npx ampx sandbox --stream-function-logs
   ```
   This command will:
   - Create a local development environment
   - Set up necessary AWS resources
   - Configure authentication
   - Stream function logs to your terminal

2. Wait for the deployment to complete. You'll see a "Create complete" message when finished.

## Step 4: Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit [http://localhost:3000](http://localhost:3000) in your browser

3. You should see:
   - The starter application homepage
   - Authentication components enabled
   - No error messages in the console

## Troubleshooting Guide

If you encounter issues:

1. **AWS Authentication Errors**
   - Double-check your environment variables
   - Ensure your AWS credentials are current
   - Try `aws sts get-caller-identity` to verify access

2. **Sandbox Deployment Issues**
   - Clear your terminal
   - Stop any running processes
   - Run `npx ampx sandbox --stream-function-logs` again

3. **Development Server Problems**
   - Ensure port 3000 is available
   - Check the terminal for error messages
   - Try stopping and restarting the server

## Next Steps

You've successfully:
✅ Configured your AWS environment
✅ Set up the development workspace
✅ Deployed the sandbox environment
✅ Verified the local development server

Ready to build your first AI agent? Continue to [Lab 2: Building Your First LangGraph Agent](lab_2.md).

## Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
