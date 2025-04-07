import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { ChatBedrockConverse } from "@langchain/aws";
import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { publishResponseStreamChunk } from "../graphql/mutations";
import { getChatSessionId, getChatSessionPrefix } from "./toolUtils";

// Schema for listing files
const listFilesSchema = z.object({
    directory: z.string().optional().describe("Optional subdirectory to list files from. Use 'global' to access shared files across all sessions."),
});

// Schema for reading a file
const readFileSchema = z.object({
    filename: z.string().describe("The path to the file. This can include subdirectories"),
});

// Schema for searching files
const searchFilesSchema = z.object({
    filePattern: z.string().describe("Regex pattern to match files. For example: '.*\\.txt$' for all text files, or 'data/.*' for all files in the data directory."),
    maxFiles: z.number().optional().default(100).describe("Maximum number of files to return. Defaults to 100."),
    includeGlobal: z.boolean().optional().default(true).describe("Whether to include global files in the search. Defaults to true."),
});

// Schema for writing a file
const writeFileSchema = z.object({
    filename: z.string().describe("The path to the file. This can include subdirectories"),
    content: z.string().describe("The content to write to the file"),
});

// Schema for updating a file
const updateFileSchema = z.object({
    filename: z.string().describe("The path to the file. This can include subdirectories"),
    operation: z.enum(["append", "prepend", "replace"]).describe("The type of update operation: append (add to end), prepend (add to beginning), or replace (find and replace content)"),
    content: z.string().describe("The content to add or use as replacement"),
    searchString: z.string().optional().describe("When using replace operation, the string to search for and replace. Required for replace operation."),
    createIfNotExists: z.boolean().optional().default(true).describe("Whether to create the file if it doesn't exist. Defaults to true."),
    isRegex: z.boolean().optional().default(false).describe("Whether the searchString should be treated as a regular expression. Defaults to false."),
    regexFlags: z.string().optional().default("g").describe("Flags for the regular expression (e.g., 'g' for global, 'm' for multiline, 'i' for case-insensitive). Default is 'g'. Only used when isRegex is true."),
    multiLine: z.boolean().optional().default(false).describe("Whether to enable multiline matching. This is a shorthand to set regexFlags to 'gm'. Only used when isRegex is true."),
});

// Schema for text to table conversion
const textToTableSchema = z.object({
    filePattern: z.string().describe("Regex pattern to select files for inclusion in the table. For example: '.*\\.txt$' for all text files, or 'data/.*' for all files in the data directory."),
    tableTitle: z.string().describe("The title of the table to be created."),
    tableColumns: z.array(
        z.object({
            columnName: z.string().describe("The name of the column to include in the table."),
            columnDescription: z.string().describe("A clear description of what information should be extracted for this column."),
            columnDataDefinition: z.object({
                type: z.union([z.string(), z.array(z.string())]).describe("The data type of the column. Can be 'string', 'number', 'boolean', or an array of types."),
                format: z.string().optional().describe("Optional format for the data, e.g., 'date', 'email', etc."),
                pattern: z.string().optional().describe("Optional regex pattern that the value must match."),
                minimum: z.number().optional().describe("Optional minimum value for number types."),
                maximum: z.number().optional().describe("Optional maximum value for number types.")
            }).optional().describe("Schema definition for the column data.")
        })
    ).describe("Array of column definitions for the table."),
    includeFilePath: z.boolean().optional().default(true).describe("Whether to include the file path as a column in the table. Defaults to true."),
    maxFiles: z.number().optional().default(50).describe("Maximum number of files to process. Defaults to 50."),
    dataToInclude: z.string().optional().describe("Description of what data to prioritize inclusion of in the table."),
    dataToExclude: z.string().optional().describe("Description of what data to exclude or de-prioritize from the table."),
});

// Helper functions for S3 operations
function getS3Client() {
    return new S3Client();
}

function getBucketName() {
    const bucketName = process.env.STORAGE_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("STORAGE_BUCKET_NAME is not set");
    }
    return bucketName;
}

// Global prefix for shared files
const GLOBAL_PREFIX = 'global/';

// Get the correct S3 prefix based on path
function getS3KeyPrefix(filepath: string) {
    // If path starts with 'global/', use the global prefix
    if (filepath.startsWith('global/')) {
        return '';
    }
    
    // Otherwise use the session-specific prefix
    return getChatSessionPrefix();
}

async function listS3Objects(prefix: string) {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const listParams = {
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/' // Use delimiter to simulate directory structure
    };
    
    try {
        const command = new ListObjectsV2Command(listParams);
        const response = await s3Client.send(command);
        
        // Process directories (CommonPrefixes)
        const directories = (response.CommonPrefixes || [])
            .map(prefixObj => {
                const name = prefixObj.Prefix?.replace(prefix, '').replace('/', '');
                return name ? { name, type: 'directory' } : null;
            })
            .filter(Boolean) as { name: string, type: 'directory' }[];
            
        // Process files (Contents)
        const files = (response.Contents || [])
            .filter(item => item.Key !== prefix) // Filter out the directory itself
            .map(item => {
                const key = item.Key as string;
                const name = key.substring(prefix.length);
                return name && !name.endsWith('/') && !name.endsWith('.s3meta') 
                    ? { name, type: 'file' } 
                    : null;
            })
            .filter(Boolean) as { name: string, type: 'file' }[];
            
        // Return combined array with type indicators
        return [...directories, ...files];
    } catch (error) {
        console.error("Error listing S3 objects:", error);
        throw error;
    }
}

export async function readS3Object(key: string) {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const getParams = {
        Bucket: bucketName,
        Key: key
    };
    
    try {
        const command = new GetObjectCommand(getParams);
        const response = await s3Client.send(command);
        
        if (response.Body) {
            // Convert stream to string
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
            }
            const content = Buffer.concat(chunks).toString('utf8');
            return content;
        } else {
            throw new Error("No content found");
        }
    } catch (error) {
        console.error(`Error reading S3 object ${key}:`, error);
        throw error;
    }
}

async function writeS3Object(key: string, content: string) {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    const putParams = {
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: getContentType(key)
    };
    
    try {
        const command = new PutObjectCommand(putParams);
        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error(`Error writing S3 object ${key}:`, error);
        throw error;
    }
}

function getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    const contentTypeMap: Record<string, string> = {
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.xml': 'application/xml',
        '.zip': 'application/zip'
    };
    
    return contentTypeMap[extension] || 'application/octet-stream';
}

// Tool to list files
export const listFiles = tool(
    async ({ directory = "" }) => {
        try {
            // Handle global directory listing
            if (directory.startsWith('global') || directory === 'global') {
                const globalDir = directory === 'global' ? 'global/' : directory;
                let fullPrefix = path.posix.join('', globalDir);
                if (!fullPrefix.endsWith('/')) {
                    fullPrefix += '/';
                }
                
                const items = await listS3Objects(fullPrefix);
                // Group items by type for better clarity
                const directories = items.filter(item => item.type === 'directory');
                const files = items.filter(item => item.type === 'file');
                
                return JSON.stringify({ 
                    path: directory,
                    directories: directories.map(d => d.name),
                    files: files.map(f => f.name),
                    items // Keep the original items with type info for backward compatibility
                });
            }
            
            // Handle session-specific directory listing
            const sessionPrefix = getChatSessionPrefix();
            let fullPrefix = path.posix.join(sessionPrefix, directory);
            if (!fullPrefix.endsWith('/')) {
                fullPrefix += '/';
            }
            
            const items = await listS3Objects(fullPrefix);
            // Group items by type for better clarity
            const directories = items.filter(item => item.type === 'directory');
            const files = items.filter(item => item.type === 'file');
            
            return JSON.stringify({ 
                path: directory,
                directories: directories.map(d => d.name),
                files: files.map(f => f.name),
                items // Keep the original items with type info for backward compatibility
            });
        } catch (error: any) {
            return JSON.stringify({ error: `Error listing files: ${error.message}` });
        }
    },
    {
        name: "listFiles",
        description: "Lists files and directories from S3 storage. The response clearly distinguishes between directories and files. Use 'global' or 'global/path' to access shared files across all sessions, or a regular path for session-specific files.",
        schema: listFilesSchema,
    }
);

// Tool to read a file from S3
export const readFile = tool(
    async ({ filename }) => {
        try {
            // Normalize the path to prevent path traversal attacks
            const targetPath = path.normalize(filename);
            if (targetPath.startsWith("..")) {
                return JSON.stringify({ error: "Invalid file path. Cannot access files outside project root directory." });
            }
            
            const prefix = getS3KeyPrefix(targetPath);
            const s3Key = path.posix.join(prefix, targetPath);
            
            try {
                const content = await readS3Object(s3Key);
                return JSON.stringify({ content });
            } catch (error: any) {
                if (error.name === 'NoSuchKey') {
                    return JSON.stringify({ error: `File not found: ${filename}` });
                }
                throw error;
            }
        } catch (error: any) {
            return JSON.stringify({ error: `Error reading file: ${error.message}` });
        }
    },
    {
        name: "readFile",
        description: "Reads the content of a file from S3 storage. Use 'global/filename' path to access shared files across all sessions.",
        schema: readFileSchema,
    }
);

// Tool to update a file in S3
export const updateFile = tool(
    async ({ 
        filename, 
        operation, 
        content, 
        searchString, 
        createIfNotExists = true,
        isRegex = false,
        regexFlags = "g",
        multiLine = false
    }) => {
        try {
            // Normalize the path to prevent path traversal attacks
            const targetPath = path.normalize(filename);
            if (targetPath.startsWith("..")) {
                return JSON.stringify({ error: "Invalid file path. Cannot update files outside project root directory." });
            }
            
            // Prevent updating files with global/ prefix
            if (targetPath.startsWith("global/")) {
                return JSON.stringify({ error: "Cannot update files in the global directory. Global files are read-only." });
            }
            
            const prefix = getChatSessionPrefix();
            const s3Key = path.posix.join(prefix, targetPath);
            
            // Check if file exists and get content if it does
            let existingContent = "";
            let fileExists = true;
            
            try {
                existingContent = await readS3Object(s3Key);
            } catch (error: any) {
                if (error.name === 'NoSuchKey') {
                    fileExists = false;
                    
                    // If file does not exist and createIfNotExists is false, return error
                    if (!createIfNotExists) {
                        return JSON.stringify({ error: `File does not exist: ${filename}` });
                    }
                } else {
                    throw error;
                }
            }
            
            let newContent;
            
            switch (operation) {
                case "append":
                    newContent = existingContent + content;
                    break;
                case "prepend":
                    newContent = content + existingContent;
                    break;
                case "replace":
                    // For non-existent or empty files, just use the new content without requiring searchString
                    if (!existingContent || existingContent.length === 0) {
                        newContent = content;
                        break;
                    }

                    // searchString is only required for non-empty files
                    if (!searchString) {
                        return JSON.stringify({ error: "searchString is required for replace operation on non-empty files" });
                    }
                    
                    if (isRegex) {
                        // If multiLine flag is set, override the regexFlags to include 'm'
                        const flags = multiLine ? "gm" : regexFlags;
                        try {
                            const regex = new RegExp(searchString, flags);
                            newContent = existingContent.replace(regex, content);
                        } catch (regexError: any) {
                            return JSON.stringify({ 
                                error: `Invalid regular expression: ${regexError.message}` 
                            });
                        }
                    } else {
                        // Escape the search string to treat it as a literal string
                        // For non-regex mode, we still want to match across multiple lines if multiLine is true
                        if (multiLine) {
                            // Split the content by lines, replace in each line, then join back
                            const lines = existingContent.split('\n');
                            
                            // Join the searchString with newlines to create a search pattern
                            const searchLines = searchString.split('\n');
                            
                            // Find the starting line of each potential match
                            for (let i = 0; i <= lines.length - searchLines.length; i++) {
                                let matches = true;
                                
                                // Check if the current position is a full match for searchLines
                                for (let j = 0; j < searchLines.length; j++) {
                                    if (lines[i + j] !== searchLines[j]) {
                                        matches = false;
                                        break;
                                    }
                                }
                                
                                // If we found a match, replace it
                                if (matches) {
                                    // Remove the matching lines
                                    lines.splice(i, searchLines.length);
                                    
                                    // Insert the new content lines
                                    const contentLines = content.split('\n');
                                    for (let j = contentLines.length - 1; j >= 0; j--) {
                                        lines.splice(i, 0, contentLines[j]);
                                    }
                                    
                                    // Adjust i to skip past what we just inserted
                                    i += contentLines.length - 1;
                                }
                            }
                            
                            newContent = lines.join('\n');
                        } else {
                            // For single-line replacements, use the standard replace method
                            newContent = existingContent.split(searchString).join(content);
                        }
                    }
                    break;
                default:
                    return JSON.stringify({ error: "Invalid operation. Must be 'append', 'prepend', or 'replace'" });
            }
            
            // Write the updated content to S3
            await writeS3Object(s3Key, newContent);
            
            const operationMessage = {
                "append": "appended to",
                "prepend": "prepended to",
                "replace": "updated in"
            }[operation];
            
            return JSON.stringify({ 
                success: true, 
                message: `Content successfully ${operationMessage} file ${filename}`,
                operation,
                fileExistedBefore: fileExists
            });
        } catch (error: any) {
            return JSON.stringify({ error: `Error updating file: ${error.message}` });
        }
    },
    {
        name: "updateFile",
        description: "Updates a file in session storage. Global files (global/filename) are read-only and cannot be updated.",
        schema: updateFileSchema,
    }
);

// Tool to write a file to S3
export const writeFile = tool(
    async ({ filename, content }) => {
        try {
            // Normalize the path to prevent path traversal attacks
            const targetPath = path.normalize(filename);
            if (targetPath.startsWith("..")) {
                return JSON.stringify({ error: "Invalid file path. Cannot write files outside project root directory." });
            }
            
            // Prevent writing files with global/ prefix
            if (targetPath.startsWith("global/")) {
                return JSON.stringify({ error: "Cannot write files to the global directory. Global files are read-only." });
            }
            
            const prefix = getChatSessionPrefix();
            const s3Key = path.posix.join(prefix, targetPath);
            
            // Create parent "directory" keys if needed
            const dirPath = path.dirname(targetPath);
            if (dirPath !== '.') {
                const directories = dirPath.split('/').filter(Boolean);
                let currentPath = prefix;
                
                for (const dir of directories) {
                    currentPath = path.posix.join(currentPath, dir, '/');
                    // Create an empty object with trailing slash to represent directory
                    await writeS3Object(currentPath, '');
                }
            }
            
            // Write the file to S3
            await writeS3Object(s3Key, content);
            
            return JSON.stringify({ 
                success: true, 
                message: `File ${filename} written successfully to S3`,
                targetPath: targetPath
            });
        } catch (error: any) {
            return JSON.stringify({ error: `Error writing file: ${error.message}` });
        }
    },
    {
        name: "writeFile",
        description: "Writes content to a new file or overwrites an existing file in session storage. Global files (global/filename) are read-only and cannot be written to.",
        schema: writeFileSchema,
    }
);

// Helper function to check if a file matches the given pattern
function fileMatchesPattern(filePath: string, pattern: string): boolean {
    try {
        const regex = new RegExp(pattern);
        return regex.test(filePath);
    } catch (error) {
        console.error(`Invalid regex pattern: ${pattern}`, error);
        return false;
    }
}

// Function to remove spaces and convert to lowercase
function normalizeColumnName(name: string): string {
    return name.replace(/\s+/g, '').toLowerCase();
}

// Add TypeScript interface for the textToTableTool parameters
interface TextToTableParams {
    filePattern: string;
    tableTitle: string;
    tableColumns: Array<{
        columnName: string;
        columnDescription: string;
        columnDataDefinition?: {
            type: string | string[];
            [key: string]: any;
        };
    }>;
    includeFilePath?: boolean;
    maxFiles?: number;
    dataToInclude?: string;
    dataToExclude?: string;
    
}

// Function to get user-specific prefix
function getUserPrefix(): string {
    return getChatSessionPrefix();
}

// Track the start time for progress updates
let progressUpdateStartTime: Date | null = null;

// Function to publish progress updates
async function publishProgressUpdate(processedCount: number, totalCount: number, chatSessionId: string, startTime?: Date) {
    const amplifyClient = getConfiguredAmplifyClient();
    try {
        // Initialize the start time if it's not set yet
        if (!progressUpdateStartTime) {
            progressUpdateStartTime = startTime || new Date();
        }
        
        // Calculate time elapsed and estimate time remaining
        const timeElapsed = (new Date().getTime() - progressUpdateStartTime.getTime()) / 1000; // in seconds
        let timeRemaining = "calculating...";
        
        // Only calculate time remaining once we have some progress (avoid division by zero)
        if (processedCount > 0) {
            const timePerItem = timeElapsed / processedCount;
            const remainingItems = totalCount - processedCount;
            const estimatedSecondsRemaining = timePerItem * remainingItems;
            
            // Format the time remaining in a human-readable format
            if (estimatedSecondsRemaining < 60) {
                timeRemaining = `${Math.round(estimatedSecondsRemaining)} seconds`;
            } else if (estimatedSecondsRemaining < 3600) {
                timeRemaining = `${Math.round(estimatedSecondsRemaining / 60)} minutes`;
            } else {
                const hours = Math.floor(estimatedSecondsRemaining / 3600);
                const minutes = Math.round((estimatedSecondsRemaining % 3600) / 60);
                timeRemaining = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
        }

        const progressPercentage = Math.round((processedCount/totalCount) * 100);
        const progressMessage = `Processing files: ${processedCount}/${totalCount} (${progressPercentage}%) - Est. time remaining: ${timeRemaining}`;
        
        await amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chunkText: progressMessage,
                index: 1,
                chatSessionId
            }
        });
    } catch (error) {
        console.error('Error publishing progress update:', error);
    }
}

// Convert textToTableTool to use the tool function from langchain
export const textToTableTool = tool(
    async (params: TextToTableParams) => {
        try {
            // Reset progress timer at the start of each run
            progressUpdateStartTime = new Date();
            
            // Publish initial notification
            const amplifyClient = getConfiguredAmplifyClient();
            await amplifyClient.graphql({
                query: publishResponseStreamChunk,
                variables: {
                    chunkText: `Starting text to table conversion for files matching pattern: ${params.filePattern}\n`,
                    index: 0,
                    chatSessionId: getChatSessionId() || ''
                }
            });

            console.log("textToTableTool params:", JSON.stringify(params, null, 2));
            
            // Remove date column if it already exists
            params.tableColumns = params.tableColumns.filter(column => column.columnName.toLowerCase() !== 'date');

            // Create column name map to restore original column names later
            const columnNameMap = Object.fromEntries(
                params.tableColumns
                    .filter(column => column.columnName !== normalizeColumnName(column.columnName))
                    .map(column => [normalizeColumnName(column.columnName), column.columnName])
            );

            // Add default score columns if dataToInclude or dataToExclude are provided
            let enhancedTableColumns = [...params.tableColumns];
            
            if (params.dataToInclude || params.dataToExclude) {
                enhancedTableColumns.unshift({
                    columnName: 'relevanceScore',
                    columnDescription: `
                        ${params.dataToExclude ? `If the text contains information related to [${params.dataToExclude}], give a lower score.` : ''}
                        ${params.dataToInclude ? `Give a higher score if text contains information related to [${params.dataToInclude}].` : ''}
                        Score on a scale from 0 to 10, where 10 is the most relevant.
                    `,
                    columnDataDefinition: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10
                    }
                });

                enhancedTableColumns.unshift({
                    columnName: 'relevanceExplanation',
                    columnDescription: `Explain why this content received its relevance score.`,
                    columnDataDefinition: {
                        type: 'string'
                    }
                });
            }

            
            enhancedTableColumns.unshift({
                columnName: 'date',
                columnDescription: `The date of the event in YYYY-MM-DD format. Can be null if no date is available.`,
                columnDataDefinition: {
                    type: ['string', 'null'],
                    format: 'date',
                    pattern: "^(?:\\d{4})-(?:(0[1-9]|1[0-2]))-(?:(0[1-9]|[12]\\d|3[01]))$"
                }
            });

            // Build JSON schema for structured output
            const fieldDefinitions: Record<string, any> = {};
            for (const column of enhancedTableColumns) {
                const normalizedColumnName = normalizeColumnName(column.columnName);
                fieldDefinitions[normalizedColumnName] = {
                    ...(column.columnDataDefinition ? column.columnDataDefinition : { type: 'string' }),
                    description: column.columnDescription
                };
            }

            // Include file path column if requested
            if (params.includeFilePath !== false) { // Default to true
                fieldDefinitions['filePath'] = {
                    type: 'string',
                    description: 'The path of the file that this data was extracted from'
                };
            }

            const jsonSchema = {
                title: "extractTableData",
                description: "Extract structured data from text content",
                type: "object",
                properties: fieldDefinitions,
                required: Object.keys(fieldDefinitions).filter(key => key !== 'filePath')
            };

            console.log('Target JSON schema for row:', JSON.stringify(jsonSchema, null, 2));

            // Search for matching files
            const matchingFiles: string[] = [];
            
            // Correct the pattern if needed
            let correctedPattern = params.filePattern;
            
            // If pattern starts with 'global/' and basePrefix already contains 'global/',
            // remove the redundant 'global/' from the pattern
            if (correctedPattern.startsWith('global/')) {
                // Keep original for user feedback but use corrected for searching
                console.log(`Corrected pattern from ${params.filePattern} to ${correctedPattern.replace('global/', '')}`);
            }
            
            // If pattern doesn't have any wildcards, treat it as a contains search
            if (!correctedPattern.includes('*') && !correctedPattern.includes('?') && 
                !correctedPattern.includes('[') && !correctedPattern.includes('(') && 
                !correctedPattern.includes('|')) {
                correctedPattern = `.*${correctedPattern}.*`;
                console.log(`Added wildcards to pattern: ${correctedPattern}`);
            }
            
            // Search in user files
            const userFiles = await findFilesMatchingPattern(
                getUserPrefix(),
                correctedPattern
            );
            matchingFiles.push(...userFiles);
            
            // Search in global files
            const globalFiles = await findFilesMatchingPattern(
                GLOBAL_PREFIX,
                correctedPattern
            );
            matchingFiles.push(...globalFiles);
            
            console.log(`Found ${matchingFiles.length} matching files`);
            
            // Check for no matches and provide helpful feedback
            if (matchingFiles.length === 0) {
                // If no files found, return a helpful error message
                const searchSuggestions = [
                    "Try a simpler search pattern (e.g., just use a distinctive part of the filename)",
                    "Check if the files exist using the listFiles tool first",
                    "For global files, you can omit the 'global/' prefix",
                    "Try using a broader pattern (e.g., '.*' for all files)"
                ];
                
                let errorMessage: {
                    error: string;
                    suggestions: string[];
                    availableFiles?: {
                        message: string;
                        global: string[];
                        user: string[];
                    };
                } = {
                    error: `No files found matching pattern: ${params.filePattern}`,
                    suggestions: searchSuggestions
                };
                
                // Try to do a broader search to suggest available files
                try {
                    const sampleGlobalFiles = await listAvailableFiles(GLOBAL_PREFIX, 5);
                    const sampleUserFiles = await listAvailableFiles(getUserPrefix(), 5);
                    
                    if (sampleGlobalFiles.length > 0 || sampleUserFiles.length > 0) {
                        errorMessage.availableFiles = {
                            message: "Here are some files that are available:",
                            global: sampleGlobalFiles,
                            user: sampleUserFiles
                        };
                    }
                } catch (error) {
                    console.error("Error getting sample files:", error);
                }
                
                return JSON.stringify(errorMessage);
            }

            // Limit the number of files
            const maxFiles = params.maxFiles || 50;
            if (matchingFiles.length > maxFiles) {
                console.log(`Found ${matchingFiles.length} matching files, limiting to ${maxFiles}`);
                matchingFiles.splice(maxFiles);
            }

            console.log(`Processing ${matchingFiles.length} files`);

            // Process each file with concurrency limit
            const tableRows = [];
            const concurrencyLimit = 3; // Process x files at a time
            let processedCount = 0;
            
            // Process files in batches to avoid hitting limits
            for (let i = 0; i < matchingFiles.length; i += concurrencyLimit) {
                const batch = matchingFiles.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map(async (fileKey) => {
                    try {
                        const fileContent = await readS3Object(fileKey);
                        
                        // Extract file path for display
                        const filePath = fileKey.startsWith(GLOBAL_PREFIX) 
                            ? fileKey.replace(GLOBAL_PREFIX, 'global/') 
                            : fileKey.replace(getUserPrefix(), '');

                        // Build the message for AI processing
                        const messageText = `
                        Extract structured data from the following text content according to the provided schema.
                        <TextContent>
                        ${fileContent}
                        </TextContent>
                        `;

                        // Use the ChatBedrockConverse model with structured output
                        const modelClient = new ChatBedrockConverse({
                            model: process.env.TEXT_TO_TABLE_MODEL_ID,
                            // Add some safety to avoid excessive token usage
                            maxTokens: 4000
                        });
                        
                        // Use withStructuredOutput for more reliable extraction
                        const structuredOutput = modelClient.withStructuredOutput(jsonSchema);
                        
                        try {
                            // Create structured output extraction
                            const structuredDataResult = await structuredOutput.invoke(messageText);
                            
                            // The result should be a proper object that matches the schema
                            const structuredData: Record<string, any> = structuredDataResult;
                            
                            // Add file path if requested
                            if (params.includeFilePath !== false) {
                                structuredData['filePath'] = filePath;
                            }

                            // Restore original column names
                            Object.keys(structuredData).forEach(key => {
                                if (key in columnNameMap) {
                                    const originalKey = columnNameMap[key];
                                    structuredData[originalKey] = structuredData[key];
                                    delete structuredData[key];
                                }
                            });

                            return structuredData;
                        } catch (error: unknown) {
                            console.error("Error processing with structured output:", error);
                            // Return error object
                            const errorRow: Record<string, any> = {
                                error: `Model structured output error: ${error instanceof Error ? error.message : String(error)}`
                            };
                            if (params.includeFilePath !== false) {
                                errorRow['filePath'] = filePath;
                            }
                            return errorRow;
                        }
                    } catch (error: any) {
                        console.error(`Error processing file ${fileKey}:`, error);
                        // Add error row
                        const errorRow: Record<string, any> = {};
                        if (params.includeFilePath !== false) {
                            errorRow['filePath'] = fileKey.replace(fileKey.startsWith(GLOBAL_PREFIX) ? GLOBAL_PREFIX : getUserPrefix(), '');
                        }
                        errorRow['error'] = `Failed to process: ${error.message}`;
                        return errorRow;
                    }
                });
                
                // Wait for all batch promises to resolve
                const batchResults = await Promise.all(batchPromises);
                tableRows.push(...batchResults);
                
                // Update progress
                processedCount += batch.length;
                await publishProgressUpdate(processedCount, matchingFiles.length, getChatSessionId() || '', new Date());
            }

            console.log(`Generated ${tableRows.length} table rows`);
            
            // Sort the table rows - primarily by date if present, otherwise by relevance score if available
            tableRows.sort((a, b) => {
                // First try to sort by date if available
                if (a['date'] && b['date']) {
                    // Compare dates (chronologically)
                    return new Date(a['date'] as string).getTime() - new Date(b['date'] as string).getTime();
                } else if (a['date']) {
                    // Items with date come before items without date
                    return -1;
                } else if (b['date']) {
                    // Items with date come before items without date
                    return 1;
                } 
                
                // If dates are not available or equal, fall back to relevance score if available
                if (params.dataToInclude || params.dataToExclude) {
                    const scoreA = (a['relevanceScore'] as number) || 0;
                    const scoreB = (b['relevanceScore'] as number) || 0;
                    return scoreB - scoreA; // Higher scores first for secondary sorting
                }
                
                // No sorting criteria available
                return 0;
            });

            // Save the table as CSV
            try {
                // Create CSV header from column names
                const columnNames = enhancedTableColumns.map(c => c.columnName);
                if (params.includeFilePath !== false) {
                    columnNames.push('filePath');
                }
                
                // Convert table rows to CSV format
                const csvRows = tableRows.map(row => {
                    return columnNames.map(colName => {
                        const value = row[colName];
                        // Handle null/undefined values
                        if (value === null || value === undefined) {
                            return '';
                        }
                        // Convert to string and escape special characters
                        const stringValue = String(value);
                        // Escape quotes and wrap in quotes if contains comma, newline, or quote
                        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                            return `"${stringValue.replace(/"/g, '""')}"`;
                        }
                        return stringValue;
                    }).join(',');
                });
                
                // Combine header and rows
                const csvContent = [columnNames.join(','), ...csvRows].join('\n');
                
                // Generate a unique filename based on timestamp
                // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const csvFilename = `data/${params.tableTitle}.csv`;
                
                // Save the CSV file
                await writeFile.invoke({
                    filename: csvFilename,
                    content: csvContent
                });
                
                // Add CSV file info to the response
                return JSON.stringify({
                    messageContentType: 'tool_table',
                    columns: enhancedTableColumns.map(c => c.columnName),
                    data: tableRows,
                    matchedFileCount: matchingFiles.length,
                    csvFile: {
                        filename: csvFilename,
                        rowCount: tableRows.length
                    }
                });
            } catch (error: any) {
                console.error('Error saving CSV file:', error);
                // Continue with the original response even if CSV saving fails
                return JSON.stringify({
                    messageContentType: 'tool_table',
                    columns: enhancedTableColumns.map(c => c.columnName),
                    data: tableRows,
                    matchedFileCount: matchingFiles.length,
                    csvError: `Failed to save CSV file: ${error.message}`
                });
            }
        } catch (error: any) {
            console.error('Error in textToTableTool:', error);
            return JSON.stringify({
                error: `Error: ${error.message || error}`,
                suggestion: "Check the file pattern and try again with a simpler pattern"
            });
        }
    },
    {
        name: "textToTableTool",
        description: `
        This tool converts unstructured text files into a structured table format.
        Provide a regex pattern to select files and define the columns you want in the table.
        This tool is best used when you need to extract structured data from a text file, and not when you need to extract a table from a table (like when processing csv files).

        File pattern examples:
        - ".*\\.txt$" - all text files
        - "data/.*" - all files in the data directory
        - "logs/.*\\.log$" - all log files in the logs directory
        - "\\d{4}-\\d{2}-\\d{2}" - files with dates in YYYY-MM-DD format
        - "15_9_19_A" - files containing "15_9_19_A" anywhere in the path (simplified search)
        
        For global files:
        - Use "global/..." for files in the global directory
        - You can also just use a pattern like "15_9_19_A" without the "global/" prefix for files in any location
        
        IMPORTANT: The pattern is automatically adjusted to improve matching:
        - If you're looking for files containing a specific string (e.g., "15_9_19_A"), you can just provide that string
        - The tool will automatically add wildcards if needed (e.g., converting "15_9_19_A" to ".*15_9_19_A.*")
        - If no files are found with the specific pattern, the tool will attempt a broader search
        
        The file pattern is applied to the relative path (without the session prefix).
        For more efficient searching, start your pattern with a literal directory prefix when possible.
        
        The tool uses advanced structured output extraction to reliably convert unstructured text 
        into structured data based on your column definitions.
        
        Results are automatically sorted by date if present, or by relevance score as a fallback.
        Each file is processed independently, and the results are combined into a single table.
        `,
        schema: textToTableSchema,
    }
);

// Helper function to list available files for suggestions
async function listAvailableFiles(prefix: string, limit: number = 10): Promise<string[]> {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            MaxKeys: 20 // Get a few more than needed to filter
        });
        
        const response = await s3Client.send(command);
        return (response.Contents || [])
            .filter(item => {
                const key = item.Key as string;
                return !key.endsWith('/') && !key.endsWith('.s3meta');
            })
            .map(item => (item.Key as string).replace(prefix, ''))
            .slice(0, limit);
    } catch (error) {
        console.error(`Error listing available files: ${error}`);
        return [];
    }
}

// Function to find files matching a pattern in S3
async function findFilesMatchingPattern(basePrefix: string, pattern: string): Promise<string[]> {
    const s3Client = getS3Client();
    const bucketName = getBucketName();
    
    // Fix common pattern mistakes
    let correctedPattern = pattern;
    
    // If pattern starts with 'global/' and basePrefix already contains 'global/',
    // remove the redundant 'global/' from the pattern
    if (basePrefix === GLOBAL_PREFIX && pattern.startsWith('global/')) {
        correctedPattern = pattern.replace('global/', '');
        console.log(`Corrected pattern from ${pattern} to ${correctedPattern}`);
    }
    
    // If pattern doesn't have any wildcards, treat it as a contains search
    if (!correctedPattern.includes('*') && !correctedPattern.includes('?') && 
        !correctedPattern.includes('[') && !correctedPattern.includes('(') && 
        !correctedPattern.includes('|')) {
        correctedPattern = `.*${correctedPattern}.*`;
        console.log(`Added wildcards to pattern: ${correctedPattern}`);
    }
    
    // First, try to extract a common prefix from the regex pattern if possible
    let searchPrefix = basePrefix;
    
    // If pattern starts with a literal part before any regex special chars, use it as prefix
    const prefixMatch = correctedPattern.match(/^([^\\.\*\+\?\|\(\)\[\]\{\}^$]+)/);
    if (prefixMatch && prefixMatch[1]) {
        searchPrefix = path.posix.join(basePrefix, prefixMatch[1]);
    }
    
    console.log(`Searching in S3 with prefix: ${searchPrefix}`);
    
    const matchingFiles: string[] = [];
    let continuationToken: string | undefined;
    
    do {
        // List objects with this prefix
        const listParams: any = {
            Bucket: bucketName,
            Prefix: searchPrefix,
            MaxKeys: 1000 // Fetch in larger batches
        };
        
        // Add continuation token if we have one
        if (continuationToken) {
            listParams.ContinuationToken = continuationToken;
        }
        
        try {
            const command = new ListObjectsV2Command(listParams);
            const response = await s3Client.send(command);
            
            // Log how many objects were found with this prefix
            console.log(`Found ${response.Contents?.length || 0} objects with prefix ${searchPrefix}`);
            
            // If no files found with the current prefix and we're not using the base prefix,
            // retry with the base prefix and a more permissive search
            if ((!response.Contents || response.Contents.length === 0) && searchPrefix !== basePrefix) {
                console.log(`No files found with prefix ${searchPrefix}, retrying with base prefix ${basePrefix}`);
                const fallbackCommand = new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: basePrefix,
                    MaxKeys: 1000
                });
                
                const fallbackResponse = await s3Client.send(fallbackCommand);
                
                // Extract matching files from fallback response
                const fallbackFiles = (fallbackResponse.Contents || [])
                    .filter(item => {
                        const key = item.Key as string;
                        // Filter out directory markers and metadata files
                        if (key.endsWith('/') || key.endsWith('.s3meta')) {
                            return false;
                        }
                        
                        // Remove the base prefix for matching and apply the pattern
                        const relativePath = key.replace(basePrefix, '');
                        const isMatch = fileMatchesPattern(relativePath, correctedPattern);
                        
                        // Log pattern matching results for debugging
                        if (isMatch) {
                            console.log(`Match found: ${relativePath} matches pattern ${correctedPattern}`);
                        }
                        
                        return isMatch;
                    })
                    .map(item => item.Key as string);
                
                matchingFiles.push(...fallbackFiles);
                
                // If we found files with the fallback approach, return them
                if (fallbackFiles.length > 0) {
                    console.log(`Found ${fallbackFiles.length} files with fallback search`);
                    return matchingFiles;
                }
            }
            
            // Extract matching files from current batch
            const currentBatchFiles = (response.Contents || [])
                .filter(item => {
                    const key = item.Key as string;
                    // Filter out directory markers and metadata files
                    if (key.endsWith('/') || key.endsWith('.s3meta')) {
                        return false;
                    }
                    
                    // Remove the base prefix for matching
                    const relativePath = key.replace(basePrefix, '');
                    const isMatch = fileMatchesPattern(relativePath, correctedPattern);
                    
                    // Log pattern matching results for debugging
                    if (isMatch) {
                        console.log(`Match found: ${relativePath} matches pattern ${correctedPattern}`);
                    }
                    
                    return isMatch;
                })
                .map(item => item.Key as string);
                
            // Add matching files to our result array
            matchingFiles.push(...currentBatchFiles);
            
            // Update continuation token for next batch
            continuationToken = response.NextContinuationToken;
            
        } catch (error) {
            console.error(`Error finding files matching pattern in S3: ${error}`);
            throw error;
        }
    } while (continuationToken);
    
    // If no files found, log available files for debugging
    if (matchingFiles.length === 0) {
        try {
            // List a sample of available files for debugging
            const sampleCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: basePrefix,
                MaxKeys: 20 // Just get a few for sample
            });
            
            const sampleResponse = await s3Client.send(sampleCommand);
            const sampleFiles = (sampleResponse.Contents || [])
                .filter(item => {
                    const key = item.Key as string;
                    return !key.endsWith('/') && !key.endsWith('.s3meta');
                })
                .map(item => (item.Key as string).replace(basePrefix, ''));
                
            if (sampleFiles.length > 0) {
                console.log(`No files matched pattern "${correctedPattern}", but here are some available files:`);
                sampleFiles.forEach(file => console.log(`- ${file}`));
            } else {
                console.log(`No files found in directory ${basePrefix}`);
            }
        } catch (error) {
            console.error(`Error listing sample files: ${error}`);
        }
    }
    
    return matchingFiles;
}

// Tool to search for files matching a pattern
export const searchFiles = tool(
    async ({ filePattern, maxFiles = 100, includeGlobal = true }) => {
        try {
            const matchingFiles: string[] = [];
            
            // Search in user files
            const userFiles = await findFilesMatchingPattern(
                getUserPrefix(),
                filePattern
            );
            matchingFiles.push(...userFiles);
            
            // Search in global files if requested
            if (includeGlobal) {
                const globalFiles = await findFilesMatchingPattern(
                    GLOBAL_PREFIX,
                    filePattern
                );
                matchingFiles.push(...globalFiles);
            }
            
            // Format file paths for display
            const formattedFiles = matchingFiles.map(fileKey => {
                if (fileKey.startsWith(GLOBAL_PREFIX)) {
                    return `global/${fileKey.substring(GLOBAL_PREFIX.length)}`;
                } else {
                    return fileKey.substring(getUserPrefix().length);
                }
            });
            
            // Limit results
            const limitedFiles = formattedFiles.slice(0, maxFiles);
            const hasMore = formattedFiles.length > maxFiles;
            
            // Return results
            return JSON.stringify({
                files: limitedFiles,
                count: limitedFiles.length,
                totalCount: formattedFiles.length,
                hasMore,
                pattern: filePattern,
                message: hasMore 
                    ? `Found ${formattedFiles.length} files, showing first ${maxFiles}. Use a more specific pattern to narrow results.` 
                    : `Found ${formattedFiles.length} files.`
            });
        } catch (error: any) {
            return JSON.stringify({
                error: `Error searching files: ${error.message || error}`,
                suggestion: "Check the file pattern and try again with a simpler pattern"
            });
        }
    },
    {
        name: "searchFiles",
        description: `
        Search for files matching a regex pattern across user and global storage.
        
        File pattern examples:
        - ".*\\.txt$" - all text files
        - "data/.*" - all files in the data directory
        - "logs/.*\\.log$" - all log files in the logs directory
        - "\\d{4}-\\d{2}-\\d{2}" - files with dates in YYYY-MM-DD format
        - "15_9_19_A" - files containing "15_9_19_A" anywhere in the path (simplified search)
        
        For global files:
        - Use "global/..." for files in the global directory
        - You can also just use a pattern like "15_9_19_A" without the "global/" prefix
        
        IMPORTANT: The pattern is automatically adjusted to improve matching:
        - If you're looking for files containing a specific string (e.g., "15_9_19_A"), you can just provide that string
        - The tool will automatically add wildcards if needed (e.g., converting "15_9_19_A" to ".*15_9_19_A.*")
        - If no files are found with the specific pattern, the tool will attempt a broader search
        
        The file pattern is applied to the relative path (without the session prefix).
        For more efficient searching, start your pattern with a literal directory prefix when possible.
        `,
        schema: searchFilesSchema,
    }
);

export const s3FileManagementTools = [
    listFiles,
    readFile,
    writeFile,
    updateFile,
    textToTableTool,
    searchFiles
]