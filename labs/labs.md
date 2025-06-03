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