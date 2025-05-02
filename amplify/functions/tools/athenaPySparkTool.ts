import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AthenaClient, StartCalculationExecutionCommand, GetCalculationExecutionCommand, StartSessionCommand, GetSessionStatusCommand, ListSessionsCommand } from '@aws-sdk/client-athena';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { publishResponseStreamChunk } from "../graphql/mutations";
import { getChatSessionId, getChatSessionPrefix, getOrigin } from "./toolUtils";
import { writeFile } from "./s3ToolBox";

// Environment variables
const getAthenaWorkgroup = () => process.env.ATHENA_WORKGROUP_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

export const getSessionSetupScript = () => { 
    return `
import os

# Create the output directory and subdirectories if they don't exist
os.makedirs('plots', exist_ok=True)
os.makedirs('data', exist_ok=True)

s3BucketName = '${process.env.STORAGE_BUCKET_NAME}'
chatSessionS3Prefix = '${getChatSessionPrefix()}'
# sc.addPyFile('s3://${process.env.STORAGE_BUCKET_NAME}/pypi/pypi_libs.zip')

def uploadDfToS3(df, file_path):
    """
    Save a PySpark DataFrame to S3 as a CSV file.
    
    This function converts the DataFrame to Pandas first, then saves it as a CSV file in memory
    before uploading to S3. This approach ensures proper handling of all data types and maintains
    column headers.
    
    Args:
        df (pyspark.sql.DataFrame): The PySpark DataFrame to save
        file_path (str): Path where the CSV should be saved, relative to the chat session directory
                        Example: 'data/data.csv' or 'plots/analysis.csv'
    
    Note:
        - The function automatically prepends the chat session prefix to the file path
        - Headers are included in the CSV output
        - Index is not included in the output to maintain data consistency
        - The file is streamed directly to S3 without saving to disk
    """
    import io
    import boto3
    
    # Convert PySpark DataFrame to Pandas and write to in-memory buffer
    csv_buffer = io.StringIO()
    df.toPandas().to_csv(csv_buffer, header=True, index=False)
    
    # Get the CSV content and encode as bytes for S3 upload
    csv_content = csv_buffer.getvalue().encode('utf-8')
    
    # Initialize S3 client and upload the file
    s3_client = boto3.client('s3')
    s3_client.put_object(
        Body=csv_content,
        Bucket=s3BucketName,
        Key=chatSessionS3Prefix + file_path
    )

def getDataFrameFromS3(file_path):
    """
    Read a CSV file from S3 and return it as a PySpark DataFrame.
    
    Args:
        file_path (str): Path to the CSV file relative to the chat session directory
        
    Returns:
        pyspark.sql.DataFrame: A PySpark DataFrame containing the CSV data
    """
    # Construct the full S3 path
    full_s3_path = f"s3://{s3BucketName}/{chatSessionS3Prefix}{file_path}"
    
    # Use spark.read to read the CSV file directly
    df = spark.read.option("header", "true") \
                   .option("inferSchema", "true") \
                   .csv(full_s3_path)
    
    return df

def downloadFileFromS3(s3_path):
    """
    Download a file from S3 to the local directory.
    
    Args:
        s3_path (str): Path to the file in S3, relative to the chat session directory
                       If path starts with 'global/', it will be accessed from the global directory
        
    Note:
        - The file will be downloaded to the same relative path in the local directory
        - Parent directories will be created if they don't exist
    """
    import boto3
    import os
    
    # Remove any leading slash to ensure we work with relative paths
    local_path = s3_path.lstrip('/')
    
    # Ensure the directory exists (using the relative path)
    dir_path = os.path.dirname(local_path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    
    # Download the file
    try:
        print(f"Downloading {s3_path} from S3...")
        s3_client = boto3.client('s3')
        
        # If path starts with 'global/', don't add the chat session prefix
        s3_key = s3_path if s3_path.startswith('global/') else chatSessionS3Prefix + s3_path
        
        s3_client.download_file(
            s3BucketName, 
            s3_key,
            local_path
        )
        print(f"Successfully downloaded {local_path}")
    except Exception as e:
        print(f"Error downloading {s3_path}: {str(e)}")

def uploadFileToS3(file_path, s3_path):
    """
    Upload a file to S3.
    
    Args:
        file_path (str): Path to the local file to upload
        s3_path (str): Path to the S3 file to upload to
    
    Note:
        - The file will be uploaded to the chat session's S3 directory
        - The S3 path will be the chat session prefix + the s3_path
    """
    import boto3
    import os
    
    s3_client = boto3.client('s3')
    
    # Get file metadata
    content_type = None
    if s3_path.endswith('.html'):
        content_type = 'text/html'
    elif s3_path.endswith('.csv'):
        content_type = 'text/csv'
    elif s3_path.endswith('.json'):
        content_type = 'application/json'
    elif s3_path.endswith('.txt'):
        content_type = 'text/plain'
    elif s3_path.endswith('.png'):
        content_type = 'image/png'
    
    # Set extra args if content type is determined
    extra_args = {}
    if content_type:
        extra_args['ContentType'] = content_type
    
    s3_client.upload_file(
        file_path, 
        s3BucketName, 
        chatSessionS3Prefix + s3_path,
        ExtraArgs=extra_args
    )
`
}

export const getPreCodeExecutionScript = (script: string) => { 
    // Match any quoted strings that look like file paths (ending with .xxx where xxx is 2-4 characters)
    const filePathRegex = /['"]([^'"]+\.[a-zA-Z0-9]{2,4})['"](?:\s*[,)}]|\s*$|\s*\n|$)/g;
    const matches = script?.match(filePathRegex) || [];
    
    // Extract just the file paths from the matches
    const filePaths = matches.map(match => {
        const pathMatch = match.match(/['"]([^'"]+\.[a-zA-Z0-9]{2,4})['"]/);
        return pathMatch ? pathMatch[1] : null;
    }).filter(Boolean);

    // Remove duplicates
    const filesToDownload = [...new Set(filePaths)];

    console.log(`Files to download: ${JSON.stringify(filesToDownload)}`);
    return `
files_to_download = ${JSON.stringify(filesToDownload)}

# Download any files that are referenced in the code
for s3_path in files_to_download:
    downloadFileFromS3(s3_path)
\n\n`
}

export const getPostCodeExecutionScript = (props?: {origin?: string}) => { 
    const origin = props?.origin || '';
    return `
import os

def upload_working_directory():
    """
    Recursively walk through the current working directory and upload all files to S3.
    Files will be uploaded preserving their directory structure.
    Note: Files in the 'global' directory are skipped as they are read-only resources.
    """
    cwd = os.getcwd()
    
    print(f"Uploading contents of current working directory ({cwd}) to S3...")
    
    for root, dirs, files in os.walk(cwd):
        for file in files:
            # Get the full local path
            local_path = os.path.join(root, file)
            
            # Calculate the relative path from the current directory
            rel_path = os.path.relpath(local_path, cwd)
            
            # Skip any hidden files or directories (those starting with .)
            if any(part.startswith('.') for part in rel_path.split(os.sep)):
                continue
                
            # Skip any __pycache__ directories
            if '__pycache__' in rel_path.split(os.sep):
                continue
                
            # Skip files in the global directory
            if rel_path.startswith('global'):
                continue
            
            # If the file is an html file, open the file, and replace any src attributes with reletive paths with the full path, including the origin.
            if local_path.lower().endswith('.html'):
                try:
                    with open(local_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if Plotly script is already present
                    plotly_script = '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>'
                    if plotly_script not in content:
                        # Add Plotly script before the closing head tag, or at the start of the body if no head tag
                        if '</head>' in content:
                            content = content.replace('</head>', f'''{plotly_script}\n</head>''')
                        elif '<body>' in content:
                            content = content.replace('<body>', f'''<body>\n{plotly_script}''')
                        else:
                            # If neither head nor body tag exists, add it at the start of the file
                            content = f'''{plotly_script}\n{content}'''
                    
                    # Function to process a path and return the full URL
                    def get_full_url(file_path):
                        # Only process relative paths that don't start with http/https/files
                        if file_path.startswith(('http://', 'https://')):
                            return file_path
                        
                        # Handle global files differently
                        if file_path.startswith('global/'):
                            return f"${origin}/file/{file_path}"
                        
                        # Construct the full asset path for session-specific files
                        return f"${origin}/file/{chatSessionS3Prefix}{file_path}"
                    
                    import re
                    
                    # Regular expression to match href="path/to/file" patterns
                    link_regex = r'href="([^"]+)"'
                    # Regular expression to match src="path/to/file" patterns
                    img_src_regex = r'src="([^"]+)"'
                    
                    # First replace all href matches
                    def replace_href(match):
                        file_path = match.group(1)
                        full_path = get_full_url(file_path)
                        return f'href="{full_path}"'
                    
                    content = re.sub(link_regex, replace_href, content)
                    
                    # Then replace all src matches
                    def replace_src(match):
                        file_path = match.group(1)
                        full_path = get_full_url(file_path)
                        return f'src="{full_path}"'
                    
                    content = re.sub(img_src_regex, replace_src, content)
                    
                    # Write the processed content back to the file
                    with open(local_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                except Exception as e:
                    print(f"Error processing HTML links in {local_path}: {str(e)}")

            # Upload the file to S3 preserving the directory structure
            print(f"Uploading {local_path} to S3...")
            uploadFileToS3(local_path, rel_path)
            
    print("Finished uploading working directory to S3")

# Execute the upload
upload_working_directory()
`
}
// Helper function to read a file from S3
async function readS3File(s3Uri: string): Promise<string> {
    try {
        // Parse the S3 URI - handle both s3:/ and s3:// formats
        if (!s3Uri.startsWith('s3:/')) {
            throw new Error(`Invalid S3 URI: ${s3Uri}`);
        }

        // Normalize the URI by removing the protocol part
        let uriWithoutProtocol: string;
        if (s3Uri.startsWith('s3://')) {
            uriWithoutProtocol = s3Uri.substring(5); // Remove 's3://'
        } else if (s3Uri.startsWith('s3:/')) {
            uriWithoutProtocol = s3Uri.substring(4); // Remove 's3:/'
        } else {
            throw new Error(`Unexpected S3 URI format: ${s3Uri}`);
        }

        const firstSlashIndex = uriWithoutProtocol.indexOf('/');

        if (firstSlashIndex === -1) {
            throw new Error(`Invalid S3 URI format: ${s3Uri}`);
        }

        const bucket = uriWithoutProtocol.substring(0, firstSlashIndex);
        const key = uriWithoutProtocol.substring(firstSlashIndex + 1);

        console.log(`Parsing S3 URI: ${s3Uri}`);
        console.log(`Bucket: ${bucket}, Key: ${key}`);

        // Create S3 client
        const s3Client = new S3Client({ region: AWS_REGION });

        // Get the object
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        const response = await s3Client.send(command);

        // Convert stream to string
        if (!response.Body) {
            throw new Error('No content found in S3 object');
        }

        // Read the stream
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as any) {
            chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
        }

        return Buffer.concat(chunks).toString('utf8');
    } catch (error: any) {
        console.error(`Error reading S3 file ${s3Uri}:`, error);
        return JSON.stringify({
            error: `Error reading S3 object ${s3Uri}: ${error.message}`
        });
    }
}

// Helper function to execute a calculation and wait for completion
export async function executeCalculation(
    athenaClient: AthenaClient,
    sessionId: string,
    code: string,
    description: string,
    chatSessionId: string,
    progressIndex: number,
    options: {
        timeoutSeconds?: number,
        waitMessage?: string,
        successMessage?: string,
        failureMessage?: string,
        continueOnFailure?: boolean
    } = {}
): Promise<{
    success: boolean,
    state: string,
    calculationId?: string,
    resultData?: any,
    newProgressIndex: number
}> {
    const {
        timeoutSeconds = 60,
        waitMessage = "⏳ Executing calculation...",
        successMessage = "✅ Calculation completed successfully",
        failureMessage = "❌ Calculation failed",
        continueOnFailure = false
    } = options;

    let currentProgressIndex = progressIndex;

    // Start the calculation execution
    const clientRequestToken = uuidv4();
    const startCommand = new StartCalculationExecutionCommand({
        SessionId: sessionId,
        CodeBlock: code,
        Description: description,
        ClientRequestToken: clientRequestToken,
    });

    console.log(`Starting calculation execution: ${description}`);
    const startResponse = await athenaClient.send(startCommand);

    if (!startResponse.CalculationExecutionId) {
        await publishProgress(chatSessionId, `${failureMessage}: No calculation ID returned`, currentProgressIndex++);
        return {
            success: false,
            state: 'FAILED',
            newProgressIndex: currentProgressIndex
        };
    }

    const calculationId = startResponse.CalculationExecutionId;
    console.log(`Calculation execution ID: ${calculationId}`);

    // Poll for completion
    await publishProgress(chatSessionId, waitMessage, currentProgressIndex++);
    let finalState = 'CREATING';
    let resultData = null;
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (
        finalState !== 'COMPLETED' &&
        finalState !== 'FAILED' &&
        finalState !== 'CANCELED' &&
        Date.now() - startTime < timeoutMs
    ) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const getCommand = new GetCalculationExecutionCommand({
            CalculationExecutionId: calculationId
        });

        try {
            const getResponse = await athenaClient.send(getCommand);
            finalState = getResponse.Status?.State || 'UNKNOWN';

            if (getResponse.Status?.StateChangeReason) {
                console.log(`State change reason: ${getResponse.Status.StateChangeReason}`);
            }

            if (getResponse.Status?.State && ['COMPLETED', 'FAILED', 'CANCELED'].includes(getResponse.Status.State) && getResponse.Result) {
                resultData = getResponse.Result;
            }
        } catch (error) {
            console.error(`Error getting calculation status: ${error}`);
        }

        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`Calculation state: ${finalState} (${elapsedSeconds}s elapsed / ${timeoutSeconds}s timeout)`);
    }

    if (finalState === 'COMPLETED') {
        await publishProgress(chatSessionId, successMessage, currentProgressIndex++);
        return {
            success: true,
            state: finalState,
            calculationId,
            resultData,
            newProgressIndex: currentProgressIndex
        };
    } else {
        if (!continueOnFailure) {
            await publishProgress(chatSessionId, `${failureMessage}: ${finalState}`, currentProgressIndex++);
        } else {
            await publishProgress(chatSessionId, `⚠️ Warning: ${failureMessage}: ${finalState}`, currentProgressIndex++);
        }

        return {
            success: false,
            state: finalState,
            calculationId,
            resultData,
            newProgressIndex: currentProgressIndex
        };
    }
}

// Helper function to publish progress updates
async function publishProgress(chatSessionId: string, message: string, index: number = 0) {
    try {
        const amplifyClient = getConfiguredAmplifyClient();
        await amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chatSessionId,
                chunkText: message,
                index
            }
        });
        console.log(`Progress update: ${message}`);
    } catch (error) {
        console.info('Error publishing progress update:', error);
    }
}

// Helper function to fetch calculation outputs from S3
export async function fetchCalculationOutputs(resultData: any, chatSessionId: string, progressIndex: number) {
    let stdoutContent = "";
    let stderrContent = "";
    let resultContent = "";

    try {
        await publishProgress(chatSessionId, "📥 Downloading results from S3...", progressIndex++);

        // Fetch stdout content if available
        if (resultData?.StdOutS3Uri) {
            const stdoutResult = await readS3File(resultData.StdOutS3Uri);
            try {
                const parsedStdout = JSON.parse(stdoutResult);
                if (parsedStdout.error) {
                    console.error('Error reading stdout file:', parsedStdout.error);
                    await publishProgress(chatSessionId, `⚠️ Warning: Error reading output: ${parsedStdout.error}`, progressIndex++);
                } else {
                    stdoutContent = stdoutResult;
                }
            } catch {
                stdoutContent = stdoutResult;
            }
        }

        // Fetch result content if available
        if (resultData?.ResultS3Uri) {
            const resultS3Content = await readS3File(resultData.ResultS3Uri);
            try {
                const parsedResult = JSON.parse(resultS3Content);
                if (parsedResult.error) {
                    console.error('Error reading result file:', parsedResult.error);
                    await publishProgress(chatSessionId, `⚠️ Warning: Error reading result data: ${parsedResult.error}`, progressIndex++);
                } else {
                    resultContent = resultS3Content;
                }
            } catch {
                resultContent = resultS3Content;
            }
        }

        // Fetch stderr content if available
        if (resultData?.StdErrorS3Uri) {
            const stderrS3Content = await readS3File(resultData.StdErrorS3Uri);
            try {
                const parsedStderr = JSON.parse(stderrS3Content);
                if (parsedStderr.error) {
                    console.error('Error reading stderr file:', parsedStderr.error);
                } else {
                    stderrContent = stderrS3Content;
                    if (stderrContent.trim()) {
                        await publishProgress(chatSessionId, `⚠️ Warning: Execution produced errors: ${stderrContent.substring(0, 100)}${stderrContent.length > 100 ? '...' : ''}`, progressIndex++);
                    }
                }
            } catch {
                stderrContent = stderrS3Content;
                if (stderrContent.trim()) {
                    await publishProgress(chatSessionId, `⚠️ Warning: Execution produced errors: ${stderrContent.substring(0, 100)}${stderrContent.length > 100 ? '...' : ''}`, progressIndex++);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching calculation output:', error);
        await publishProgress(chatSessionId, `⚠️ Warning: Error while fetching output: ${error}`, progressIndex++);
    }

    return {
        stdout: stdoutContent,
        result: resultContent,
        stderr: stderrContent,
        s3: {
            stdout: resultData?.StdOutS3Uri,
            result: resultData?.ResultS3Uri,
            stderr: resultData?.StdErrorS3Uri
        }
    };
}

// Helper function to find an existing active session for a chat session
async function findExistingSession(athenaClient: AthenaClient, chatSessionId: string): Promise<string | null> {
    try {
        console.log(`Looking for existing session for chat session: ${chatSessionId}`);

        const listSessionsCommand = new ListSessionsCommand({
            WorkGroup: getAthenaWorkgroup(),
            // Only look for recent sessions that might be active
            StateFilter: 'IDLE'
        });

        const response = await athenaClient.send(listSessionsCommand);

        if (!response.Sessions || response.Sessions.length === 0) {
            console.log('No active sessions found');
            return null;
        }

        // Find a session that was created with this chat session ID
        // SessionSummary doesn't have ClientRequestToken, so we check Description
        // which includes the chat session ID as part of the description
        const matchingSession = response.Sessions.find(session =>
            session.Description?.includes(`[ChatSessionID:${chatSessionId}]`) &&
            session.SessionId &&
            session.Status?.State !== 'TERMINATED'  // Exclude terminated sessions
        );

        if (matchingSession && matchingSession.SessionId) {
            console.log(`Found existing session: ${matchingSession.SessionId}`);
            return matchingSession.SessionId;
        }

        console.log('No matching session found for this chat session ID');
        return null;
    } catch (error) {
        console.error('Error finding existing session:', error);
        return null;
    }
}

// Helper function to check if a session is active and usable
async function isSessionActive(athenaClient: AthenaClient, sessionId: string): Promise<{ isActive: boolean, state: string }> {
    try {
        const getSessionStatusCommand = new GetSessionStatusCommand({
            SessionId: sessionId
        });

        const response = await athenaClient.send(getSessionStatusCommand);
        const state = response.Status?.State || 'UNKNOWN';

        if (state === 'IDLE') {
            console.log(`Session ${sessionId} is active and idle`);
            return { isActive: true, state };
        }

        console.log(`Session ${sessionId} is not in IDLE state, current state: ${state}`);
        return { isActive: false, state };
    } catch (error) {
        console.error(`Error checking session status for ${sessionId}:`, error);
        return { isActive: false, state: 'ERROR' };
    }
}

// Schema for the PySpark execution tool
const pysparkToolSchema = z.object({
    code: z.string().optional().describe("PySpark code to execute. If provided, this code will be saved to scriptPath before execution. The 'spark' session is already initialized."),
    timeout: z.number().optional().default(300).describe("Timeout in seconds for the execution"),
    description: z.string().optional().describe("Optional description for the execution"),
    scriptPath: z.string().describe("Path for the script file. If code is provided, the script will be saved here. If code is not provided, an existing script at this path will be executed. Must start with 'scripts/'")
});

export const pysparkTool = (props: {additionalSetupScript?: string, additionalToolDescription?: string}) => tool(
    async (params) => {
        const { code, scriptPath, timeout = 300, description = "PySpark execution" } = params;
        const { additionalSetupScript = '' } = props;
        let progressIndex = 0;
        const chatSessionId = getChatSessionId();
        let sessionId: string | null = null;
        if (!chatSessionId) {
            throw new Error("Chat session ID not found");
        }
        try {
            let codeToExecute = ''
            // Save the script file
            if (code && scriptPath) {
                // Save the code to a file
                codeToExecute = getPreCodeExecutionScript(code) + code + getPostCodeExecutionScript({origin: getOrigin() || ''});
                await writeFile.invoke({
                    filename: scriptPath,
                    content: getSessionSetupScript() + additionalSetupScript + '\n' + codeToExecute
                });
                console.log(`Saved code to file: ${scriptPath}`);
            } else {
                // Load the code from a file
                const scriptContent = await readS3File(`s3://${process.env.STORAGE_BUCKET_NAME}/${getChatSessionPrefix()}${scriptPath}`);
                codeToExecute =  getPreCodeExecutionScript(scriptContent) + scriptContent; //Saved scripts will always have the post execution script
                console.log(`Loaded code from file: ${scriptPath}`);
            }

            // Publish initial message
            await publishProgress(chatSessionId, "🚀 Starting PySpark execution environment...", progressIndex++);

            // Create Athena client
            const athenaClient = new AthenaClient({ region: AWS_REGION });

            // Try to find an existing active session first
            await publishProgress(chatSessionId, "🔍 Checking for existing session...", progressIndex++);

            // First look for an existing session for this chat session
            const existingSessionId = await findExistingSession(athenaClient, chatSessionId);

            // Track the state of any existing session
            let existingSessionState = '';

            if (existingSessionId) {
                // Check if the session is still active
                const { isActive, state } = await isSessionActive(athenaClient, existingSessionId);
                existingSessionState = state;

                if (isActive) {
                    sessionId = existingSessionId;
                    await publishProgress(chatSessionId, `✅ Reusing existing Athena session (faster execution)`, progressIndex++);
                    console.log(`Reusing existing active session: ${sessionId} for chat session: ${chatSessionId}`);
                } else {
                    const stateMessage = state === 'TERMINATED' ? 'terminated' : 'no longer active';
                    await publishProgress(chatSessionId, `⚠️ Found existing session but it's ${stateMessage}, creating a new one... (Previous Session ID: ${existingSessionId})`, progressIndex++);
                    console.log(`Found session ${existingSessionId} but it's in ${state} state, will create new session`);
                }
            }

            // If no active session was found, create a new one
            if (!sessionId) {
                await publishProgress(chatSessionId, "🔄 Creating new Athena session...", progressIndex++);

                // Generate a new session token
                const sessionToken = uuidv4()

                console.log('New session token: ', sessionToken);

                const startSessionCommand = new StartSessionCommand({
                    WorkGroup: getAthenaWorkgroup(),
                    Description: `Session for ${description} [ChatSessionID:${chatSessionId}]`,
                    ClientRequestToken: sessionToken,
                    EngineConfiguration: {
                        MaxConcurrentDpus: 20,
                        SparkProperties: {
                            "spark.sql.catalog.spark_catalog": "org.apache.iceberg.spark.SparkSessionCatalog",
                            "spark.sql.catalog.spark_catalog.catalog-impl": "org.apache.iceberg.aws.glue.GlueCatalog",
                            "spark.sql.catalog.spark_catalog.io-impl": "org.apache.iceberg.aws.s3.S3FileIO",
                            "spark.sql.extensions": "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"
                        }
                    }
                });

                console.log(`Starting Athena session in workgroup: ${getAthenaWorkgroup()}`);
                const sessionResponse = await athenaClient.send(startSessionCommand);

                if (!sessionResponse.SessionId) {
                    await publishProgress(chatSessionId, "❌ Failed to create Athena session", progressIndex++);
                    return JSON.stringify({
                        error: "Failed to create Athena session",
                        details: "No session ID was returned"
                    });
                }

                sessionId = sessionResponse.SessionId;
                console.log(`Session ID: ${sessionId}`);
                await publishProgress(chatSessionId, `✅ Athena session created with ID: ${sessionId}`, progressIndex++);

                // Wait for the session to be IDLE
                await publishProgress(chatSessionId, "⏳ Waiting for session to be ready...", progressIndex++);
                let sessionState = 'CREATING';
                let sessionAttempts = 0;
                let lastReportedPercentage = 0;
                const maxSessionAttempts = Math.ceil(timeout / 5); // Poll roughly every 5 seconds

                while (sessionState !== 'IDLE' && sessionState !== 'FAILED' && sessionState !== 'TERMINATED' && sessionAttempts < maxSessionAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    try {
                        const getSessionStatusResponse = await athenaClient.send( new GetSessionStatusCommand({
                            SessionId: sessionId
                        }));
                        sessionState = getSessionStatusResponse.Status?.State || 'UNKNOWN';
                        const stateChangeReason = getSessionStatusResponse.Status?.StateChangeReason;
                        console.log(`Current session state: ${sessionState} (Attempt ${sessionAttempts + 1}/${maxSessionAttempts})`);
                        if (stateChangeReason) {
                            console.log(`State change reason: ${stateChangeReason}`);
                        }

                        // Calculate percentage for progress updates
                        const percentage = Math.round((sessionAttempts / maxSessionAttempts) * 100);

                        // Only update if the percentage changed significantly (e.g., by 10%)
                        if (percentage - lastReportedPercentage >= 10) {
                            await publishProgress(
                                chatSessionId,
                                `⏳ Initializing session: ${sessionState}${stateChangeReason ? ` (Reason: ${stateChangeReason})` : ''} (${percentage}% complete)`,
                                progressIndex
                            );
                            lastReportedPercentage = percentage;
                        }
                    } catch (error) {
                        console.error('Error getting session status:', error);
                    }

                    sessionAttempts++;
                }

                if (sessionState !== 'IDLE') {
                    const finalStatusCommand = new GetSessionStatusCommand({
                        SessionId: sessionId
                    });
                    let failureReason = '';
                    try {
                        const finalStatus = await athenaClient.send(finalStatusCommand);
                        if (finalStatus.Status?.StateChangeReason) {
                            failureReason = ` (Reason: ${finalStatus.Status.StateChangeReason})`;
                        }
                    } catch (error) {
                        console.error('Error getting final session status:', error);
                    }

                    await publishProgress(chatSessionId, `❌ Session failed to reach ready state: ${sessionState}${failureReason} (Session ID: ${sessionId})`, progressIndex++);
                    return JSON.stringify({
                        error: "Session did not reach IDLE state",
                        state: sessionState,
                        stateChangeReason: failureReason.replace(' (Reason: ', '').replace(')', '') || undefined,
                        sessionId: sessionId
                    });
                }

                await publishProgress(chatSessionId, `✅ Session ready! Setting up environment... (Session ID: ${sessionId})`, progressIndex++);

                // Setup the session with functions relevant to the user's chat session
                const sessionSetupResult = await executeCalculation(
                    athenaClient,
                    sessionId,
                    getSessionSetupScript() + additionalSetupScript   ,
                    "Session Setup",
                    chatSessionId,
                    progressIndex,
                    {
                        timeoutSeconds: 60, // About 1 minute max wait time
                        waitMessage: `📚 Setting up session... (Session ID: ${sessionId})`,
                        successMessage: `✅ Successfully set up session (Session ID: ${sessionId})`,
                        failureMessage: `Failed to set up session (Session ID: ${sessionId})`,
                        continueOnFailure: true
                    }
                );

                progressIndex = sessionSetupResult.newProgressIndex;
            }

            await publishProgress(chatSessionId, `✅ Submitting your PySpark code for execution... (Session ID: ${sessionId})`, progressIndex++);

            // Execute the main code
            const codeResult = await executeCalculation(
                athenaClient,
                sessionId,
                codeToExecute,
                description,
                chatSessionId,
                progressIndex,
                {
                    timeoutSeconds: Math.ceil(timeout),
                    waitMessage: `⏳ Executing PySpark code... (Session ID: ${sessionId})`,
                    successMessage: `✅ Execution completed! Fetching results... (Session ID: ${sessionId})`
                }
            );

            progressIndex = codeResult.newProgressIndex;

            // Check final state
            if (codeResult.success) {
                // Get stdout content
                if (!codeResult.resultData?.StdOutS3Uri) {
                    await publishProgress(chatSessionId, `⚠️ Execution completed but no output location found (Session ID: ${sessionId})`, progressIndex++);
                    return JSON.stringify({
                        status: "COMPLETED",
                        message: "Execution completed but no output location found",
                        sessionId: sessionId
                    });
                }

                // Use the helper function to fetch outputs
                const outputs = await fetchCalculationOutputs(codeResult.resultData, chatSessionId, progressIndex);
                progressIndex += 3; // Account for progress updates in the helper function

                await publishProgress(chatSessionId, `✅ All results fetched successfully! (Session ID: ${sessionId})`, progressIndex++);
                await publishProgress(chatSessionId, `🎉 PySpark execution completed successfully! (Session ID: ${sessionId})`, progressIndex++);

                return JSON.stringify({
                    status: "COMPLETED",
                    output: {
                        ...outputs,
                        message: `PySpark execution completed successfully. (Session ID: ${sessionId})`
                    },
                    sessionId: sessionId
                });
            } else {
                await publishProgress(chatSessionId, `❌ Execution failed with state: ${codeResult.state} (Session ID: ${sessionId})`, progressIndex++);

                // Use the helper function to fetch outputs even in failure case
                const outputs = await fetchCalculationOutputs(codeResult.resultData, chatSessionId, progressIndex);

                return JSON.stringify({
                    status: codeResult.state,
                    error: "PySpark execution did not complete successfully",
                    details: "Check logs for more information",
                    output: outputs,
                    sessionId: sessionId
                });
            }
        } catch (error: any) {
            await publishProgress(chatSessionId, `❌ Error: ${error.message} (Session ID: ${sessionId || 'Not Created'})`, progressIndex++);
            return JSON.stringify({
                error: `Error executing PySpark code: ${error.message}`,
                suggestion: "Check your code syntax and try again",
                sessionId: sessionId || 'Not Created'
            });
        }
    },
    {
        name: "pysparkTool",
        description: `
Use this tool to execute PySpark code using AWS Athena. The tool will create an Athena session,
execute the provided PySpark code, and return the execution results.

Important notes:
- When fitting curves, ALWAYS check the curve fit quality!
- The function downloadFileFromS3 is already defined in the execution environment. ALWAYS use it to load files into the execution environment.
    * Ex: downloadFileFromS3('relative/path/to/file.csv');
- Before loading a csv file from S3, read the file to check the column names and data types.
- Any files saved to the working directory will be uploaded to the user's chat session's artifacts in S3.
- The file hiearchy will be perserved when uploading files from the working directory to S3 (ex: data/dataframe.csv will be uploaded as data/dataframe.csv in the chat session's S3 prefix).
- Save data files under the data/ directory.
- Save plot files under the plots/ directory.
- Perfer saving dfs with pandas instead of with spark.
- If you need to load a csv file from S3, use the pd.read_csv function.
- The 'spark' session is already initialized in the execution environment
- NEVER modify the spark configuration. It is already set up for you.
- You don't need to import SparkSession or create a new session
- The STDOUT and STDERR are captured and returned in the response
- The execution results will be returned directly in the response
- When converting strings to dates, handle errors by using: pd.to_datetime(events_df['EventDate'], errors='coerce')
- Don't use this tool to write reports. Print data requried for the report to the console.

Example usage:
- Perform data analysis using PySpark
- Create and manipulate Spark DataFrames
- Run data transformations and aggregations
- Generate visualizations from data

Load and save data example:
\`\`\`python
# Load a csv file from S3
df_pd = pd.read_csv('data/example.csv')
df = spark.createDataFrame(df_pd)

# Show the DataFrame
print("Sample DataFrame:")
df.show()

# Perform some analysis
print("Statistics:")
df.describe().show()

# Save the DataFrame to S3
uploadDfToS3(df, 'data/dataframe.csv')

# or save the df in Pandas format and it will be uploaded to S3
df.toPandas().to_csv('data/dataframe.csv', header=True, mode='overwrite')

# Read the DataFrame from S3
df = getDataFrameFromS3('data/dataframe.csv')

# Show the DataFrame
df.show()
\`\`\`

Example saving a plot to S3:
\`\`\`python
import numpy as np
import plotly.graph_objs as go
import plotly.io as pio

# Create some sample data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create a Plotly figure. Never give the figure height or width so the content can scale based on the screen size.
fig = go.Figure(data=go.Scatter(x=x, y=y, mode='lines'))
fig.update_layout(title='Sine Wave', 
                xaxis_title='X Axis', 
                yaxis_title='Y Axis')

# Write the HTML to a file
fig.write_html('plots/lng_time_series.html')

print("HTML plot exported successfully!")
\`\`\`

Available libraries:
kiwisolver==1.4.4
matplotlib==3.5.2
mpmath==1.2.1
numpy==1.23.1
pytz==2022.1
scikit-learn==1.1.1
scipy==1.8.1
pyarrow==9.0.0
` + (props.additionalToolDescription || ''),
        schema: pysparkToolSchema,
    }
);
