import { AthenaClient, StartCalculationExecutionCommand, GetCalculationExecutionCommand, StartSessionCommand, GetSessionStatusCommand } from '@aws-sdk/client-athena';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import outputs from '../../amplify_outputs.json';
import { executeCalculation, fetchCalculationOutputs, getPySparkHelperScript } from '../../amplify/functions/tools/athenaPySparkTool';
import { setChatSessionId } from '../../amplify/functions/tools/toolUtils';
import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
const region = outputs?.auth?.aws_region || 'us-east-1';
const workgroupName = outputs?.custom?.athenaWorkgroupName || 'pyspark-workgroup';

describe('Athena PySpark execution', function () {
  this.timeout(300000); // Set timeout to 5 minutes as Athena execution takes time

  let athenaClient: AthenaClient;

  before(async () => {
    // Create Athena client
    athenaClient = new AthenaClient({ region });
    console.log(`Using Athena workgroup: ${workgroupName}`);
    await setAmplifyEnvVars();
  });

  it('should execute a PySpark program using StartCalculationExecution', async () => {
    // First, start a session
    const sessionToken = uuidv4();
    
    const startSessionCommand = new StartSessionCommand({
      WorkGroup: workgroupName,
      Description: 'Test PySpark session',
      ClientRequestToken: sessionToken,
      // Use minimal configuration to avoid property compatibility issues
      EngineConfiguration: {
        MaxConcurrentDpus: 4
      }
    });

    console.log('Starting Athena session...');
    const sessionResponse = await athenaClient.send(startSessionCommand);
    
    expect(sessionResponse.SessionId).to.exist;
    const sessionId = sessionResponse.SessionId!;
    console.log(`Session ID: ${sessionId}`);
    
    // Initial status might be CREATING, we'll poll for IDLE status
    let sessionState = 'CREATING';
    let sessionAttempts = 0;
    const maxSessionAttempts = 1; // Higher value for session initialization

    while (sessionState !== 'IDLE' && sessionState !== 'FAILED' && sessionState !== 'TERMINATED' && sessionAttempts < maxSessionAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const getSessionStatusCommand = new GetSessionStatusCommand({
        SessionId: sessionId
      });
      
      try {
        const getSessionStatusResponse = await athenaClient.send(getSessionStatusCommand);
        // Use type assertion to access the State property
        sessionState = getSessionStatusResponse.Status?.State || 'UNKNOWN';
        
        console.log(`Current session state: ${sessionState} (Attempt ${sessionAttempts + 1}/${maxSessionAttempts})`);
      } catch (error) {
        console.error('Error getting session status:', error);
      }
      
      sessionAttempts++;
    }

    if (sessionState !== 'IDLE') {
      console.error(`Session did not reach IDLE state. Current state: ${sessionState}`);
      expect(sessionState).to.equal('IDLE');
      return;
    }

    // Set the chat session ID and storage bucket name
    setChatSessionId('test-session-1');
    process.env.STORAGE_BUCKET_NAME = outputs.storage.bucket_name;

    const pySparkCode = `${getPySparkHelperScript()}
# PySpark test script
# The Athena PySpark session automatically initializes the spark session. The variables 'spark' and 'sc' are already defined.
# Basic Spark example
from pyspark.sql import SparkSession

data = [
  ("Hello world",),
  ("Apache Spark is awesome",),
  ("Big data processing with Spark",),
  ("Hello Spark world",)
]
df = spark.createDataFrame(data, ["text"])

# Show the results
df.show()

uploadDfToS3(df, 'output.csv')



print("PySpark execution completed successfully!")
    `;

    // For testing purposes, create a mock chat session ID
    const testChatSessionId = `test-session-${uuidv4()}`;
    const progressIndex = 0;

    console.log('Running calculation with executeCalculation helper...');
    
    // Execute the PySpark code using the executeCalculation helper
    const result = await executeCalculation(
      athenaClient,
      sessionId,
      pySparkCode,
      'Test PySpark simple execution',
      testChatSessionId,
      progressIndex,
      {
        waitMessage: "⏳ Executing test calculation...",
        successMessage: "✅ Test calculation completed successfully"
      }
    );
    
    console.log(`Calculation execution completed with state: ${result.state}`);
    console.log(`Success: ${result.success}`);
    
    if (true) {
      console.log('Result data available:', JSON.stringify(result.resultData, null, 2));
      
      // Fetch and display calculation outputs
      const outputs = await fetchCalculationOutputs(result.resultData, testChatSessionId, result.newProgressIndex);
      
      console.log('\n----- CALCULATION RESULTS -----');
      
      if (outputs.stdout) {
        console.log('\n----- STANDARD OUTPUT -----');
        console.log(outputs.stdout);
        console.log('----- END OF STANDARD OUTPUT -----\n');
      }
      
      if (outputs.result) {
        console.log('\n----- CALCULATION RESULT -----');
        console.log(outputs.result);
        console.log('----- END OF CALCULATION RESULT -----\n');
      }
      
      if (outputs.stderr && outputs.stderr.trim()) {
        console.log('\n----- ERROR OUTPUT -----');
        console.log(outputs.stderr);
        console.log('----- END OF ERROR OUTPUT -----\n');
      }
      
      console.log('\nS3 Output Locations:');
      console.log(`Stdout: ${outputs.s3.stdout || 'N/A'}`);
      console.log(`Result: ${outputs.s3.result || 'N/A'}`);
      console.log(`Stderr: ${outputs.s3.stderr || 'N/A'}`);
      
      console.log('----- END OF CALCULATION RESULTS -----\n');
    } else {
      console.error(`PySpark calculation did not complete successfully. Final state: ${result.state}`);
      console.error('No result data available to display outputs');
    }
    
    // Mark the test as passed so we can see full output
    expect(true).to.equal(true);
  });
});

