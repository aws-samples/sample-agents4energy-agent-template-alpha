import { setAmplifyEnvVars, getConfiguredAmplifyClient } from '../utils/amplifyUtils';
import { setChatSessionId } from '../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../test/utils';
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'yaml';

// Set environment variables first
const outputs = loadOutputs();
process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name;
process.env.ATHENA_WORKGROUP_NAME = outputs?.custom?.athenaWorkgroupName;
console.log("Storage Bucket: ", process.env.STORAGE_BUCKET_NAME);
console.log("Athena Workgroup: ", process.env.ATHENA_WORKGROUP_NAME);

// Import tools after setting environment variables
import { pysparkTool } from '../amplify/functions/tools/athenaPySparkTool';
import { createChatSession } from '../amplify/functions/graphql/mutations';

// Read the Python file content
const readCsvFileContent = fs.readFileSync(path.join(__dirname, 'fitStepFunctionScript.py'), 'utf-8');

const main = async () => {
  await setAmplifyEnvVars();
  const amplifyClient = getConfiguredAmplifyClient();

  // Create a new chat session
  console.log('Creating new chat session');
  const newChatSessionResponse = await amplifyClient.graphql({
    query: createChatSession,
    variables: {
      input: {
        name: 'Test - Fit Step Function to Wells'
      }
    }
  });
  const newChatSession = newChatSessionResponse.data.createChatSession;
  if (newChatSessionResponse.errors) {
    console.error(newChatSessionResponse.errors);
    process.exit(1);
  }

  console.log(newChatSession);
  setChatSessionId(newChatSession.id);
  
  const result = await pysparkTool({}).invoke({
    code: `s3BucketName = '${process.env.STORAGE_BUCKET_NAME}'
    ` + readCsvFileContent,
    description: 'Read the wells CSV file',
    scriptPath: path.join('scripts', 'fitStepFunctionScript.py')
  });
  
  console.log(stringify(JSON.parse(result)));
}

main()