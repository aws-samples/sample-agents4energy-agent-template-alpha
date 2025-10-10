# User Management Guide

This guide provides detailed instructions for creating and managing users in the AWS Amplify application.

## Create a User in AWS Amplify Console

Follow these step-by-step instructions to create users through the AWS Amplify console:

1. **Navigate to AWS Amplify Console**
   - Go to the AWS Amplify page in the AWS Console: https://us-east-1.console.aws.amazon.com/amplify/apps

2. **Access Your Application**
   - Click on your application (e.g., "sample-agents4energy-agent-template-alpha")
   - Click on the deployed branch (e.g., "no-guest-access")

3. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar

4. **Create New User**
   - Click "Create user" button
   - Fill out the user information:
     - Email address (required)
     - Temporary password
     - Any additional user attributes as needed
   - Share the temporary password with the user securely

5. **User First Login**
   - The user will need to log in with their email and temporary password
   - They will be prompted to create a permanent password on first login

## Alternative User Creation Methods

### Using the Command Line Script
For development environments, you can use the provided script:
```bash
node scripts/createUser.js
```

### Enabling Self-Registration
To allow users to create their own accounts:
1. Navigate to the AWS Cognito console
2. Select your User Pool
3. Go to "Authentication -> Sign-up" tab
4. Under "Self-service sign-up", change "Self-registration" to "Enabled"

## User Management Best Practices

- Always use secure temporary passwords
- Communicate temporary passwords through secure channels
- Monitor user creation and login activities
- Regularly review user permissions and access levels
