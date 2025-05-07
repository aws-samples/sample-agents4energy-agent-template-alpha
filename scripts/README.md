# API Scripts Usage Guide

## Setting Up Environment Variables

Before running the scripts that interact with the API, you need to set up your API credentials as environment variables.

### On macOS/Linux:

You can set environment variables in your terminal session:

```bash
# Set environment variables
export API_USERNAME="your_username"
export API_PASSWORD="your_password"

# Verify they are set correctly
echo $API_USERNAME
echo $API_PASSWORD
```

For convenience, you can add these to your shell profile file (e.g., `~/.zshrc` or `~/.bash_profile`):

```bash
echo 'export API_USERNAME="your_username"' >> ~/.zshrc
echo 'export API_PASSWORD="your_password"' >> ~/.zshrc
source ~/.zshrc
```

### On Windows:

Using Command Prompt:

```cmd
set API_USERNAME=your_username
set API_PASSWORD=your_password
```

Using PowerShell:

```powershell
$env:API_USERNAME = "your_username"
$env:API_PASSWORD = "your_password"
```

## Running the Scripts

### Individual Well Data

To fetch production data for a single well:

```bash
npm run ts-node scripts/uploadCsvProductionDataFromAPI.ts
```

### Bulk Well Data Processing

To process multiple wells from a CSV file:

```bash
npm run ts-node scripts/hydrateProductionDataLake.ts
```

## Authentication Details

The scripts handle authentication automatically:

1. Initial login using your credentials
2. Token management (storing and using the token)
3. Automatic token refresh when expired
4. Error handling for authentication failures

No manual token management is required.
