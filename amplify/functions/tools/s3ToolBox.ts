import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, ListObjectsV2CommandInput } from "@aws-sdk/client-s3";
import { ChatBedrockConverse } from "@langchain/aws";
import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { publishResponseStreamChunk } from "../graphql/mutations";
import { getChatSessionId, getChatSessionPrefix, getOrigin } from "./toolUtils";
import { validate } from 'jsonschema';
import { stringifyLimitStringLength } from "../../../utils/langChainUtils";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { match } from "assert";
// import { stringifyLimitStringLength } from "../../../utils/stringUtils";

// Schema for listing files
const listFilesSchema = z.object({
    directory: z.string().optional().describe("Optional subdirectory to list files from. Use 'global' to access shared files across all sessions."),
});

// Schema for reading a file
const readFileSchema = z.object({
    filename: z.string().describe("The path to the file. This can include subdirectories"),
    startAtByte: z.number().optional().default(0).describe("The byte to start reading from. Defaults to 0."),
    // maxBytes: z.number().optional().default(1024).describe("Maximum number of bytes to read from the file. Defaults to 1KB. Set to 0 to read entire file.")
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
                maximum: z.number().optional().describe("Optional maximum value for number types."),
                enum: z.array(z.string()).optional().describe("Optional array of allowed values for the column.")
            }).optional().describe("Schema definition for the column data.")
        })
    ).describe("Array of column definitions for the table."),
    includeFilePath: z.boolean().optional().default(true).describe("Whether to include the file path as a column in the table. Defaults to true."),
    maxFiles: z.number().optional().default(50).describe("Maximum number of files to process. Defaults to 50."),
    dataToInclude: z.string().optional().describe("Description of what data to prioritize inclusion of in the table."),
    dataToExclude: z.string().optional().describe("Description of what data to exclude or de-prioritize from the table."),
});

interface FieldDefinition {
    type: string | Array<string>;
    description: string;
    format?: string;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    default?: any;
    items?: any;
}

interface JsonSchema {
    title: string | Array<string>;
    description: string;
    type: string;
    properties: Record<string, FieldDefinition>;
    required: string[];
}

export async function correctStructuredOutputResponse(model: { invoke: (arg0: any) => any; }, response: { raw: BaseMessage; parsed: Record<string, any>; }, targetJsonSchema: JsonSchema, messages: BaseMessage[]) {
    for (let attempt = 0; attempt < 3; attempt++) {

        // if any value in the parsed response object is '<UNKNOWN>', replace that value with null
        if (response.parsed && typeof response.parsed === 'object') {
            Object.keys(response.parsed).forEach(key => {
                if (response.parsed[key] === '<UNKNOWN>') {
                    response.parsed[key] = null;
                }
            });
        }

        const validationReslut = validate(response.parsed, targetJsonSchema);

        if (validationReslut.valid) break
        console.log(`Data validation result (${attempt}): `, validationReslut.valid);

        console.log("Data validation error:", validationReslut.errors.join('\n'));
        console.log('Model response which caused error: \n', response.parsed);
        messages.push(
            new AIMessage({ content: JSON.stringify(response.parsed) }),
            new HumanMessage({ content: `Data validation error: ${validationReslut.errors.join('\n')}. Please try again.` })
        );
        // console.log('Messages sent to model: \n', stringifyLimitStringLength(messages))

        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await model.invoke(messages)
    }

    console.log('Parsed model response: ', response.parsed)

    if (!response.parsed) throw new Error("No parsed response from model");

    return response
}

export const getStructuredOutputResponse = async (props: { modelId: string, messages: BaseMessage[], outputStructure: JsonSchema }) => {
    const chatModelWithStructuredOutput = new ChatBedrockConverse({
        model: props.modelId || process.env.MODEL_ID,
        temperature: 0
    }).withStructuredOutput(
        props.outputStructure,
        { includeRaw: true }
    )

    let structuredOutputResponse = await chatModelWithStructuredOutput.invoke(props.messages)

    structuredOutputResponse = await correctStructuredOutputResponse(
        chatModelWithStructuredOutput,
        structuredOutputResponse,
        props.outputStructure,
        props.messages
    )

    if (!structuredOutputResponse.parsed) throw new Error(`No parsed response from model. Full response: ${structuredOutputResponse}`);

    return structuredOutputResponse.parsed
}

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

interface S3ReadResult {
    content: string;
    wasTruncated: boolean;
    totalBytes: number;
    bytesRead: number;
    truncationMessage?: string;
}

export async function readS3Object(props: { key: string, maxBytes: number, startAtByte: number }): Promise<S3ReadResult> {
    const { key, maxBytes = 2048, startAtByte = 0 } = props;
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    const getParams = {
        Bucket: bucketName,
        Key: key,
        Range: maxBytes > 0 ? `bytes=${startAtByte}-${startAtByte + maxBytes - 1}` : undefined
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

            // Check if content was truncated, accounting for startAtByte
            const contentLength = parseInt(response.ContentRange?.split('/')[1] || '0', 10);
            const wasTruncated = maxBytes > 0 && (contentLength - startAtByte) > maxBytes;

            return {
                content,
                wasTruncated,
                totalBytes: contentLength,
                bytesRead: content.length,
                truncationMessage: wasTruncated ?
                    `\n[...File truncated. Showing bytes ${startAtByte} to ${startAtByte + content.length} of ${contentLength} total bytes...]` :
                    undefined
            };
        } else {
            throw new Error("No content found");
        }
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            throw error; // Rethrow NoSuchKey errors as is
        }
        // For Range errors, retry without range
        if (error.$metadata?.httpStatusCode === 416) {
            // Invalid range, retry without range
            const retryCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: key
            });
            const response = await s3Client.send(retryCommand);
            if (response.Body) {
                const chunks: Buffer[] = [];
                for await (const chunk of response.Body as any) {
                    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
                }
                const content = Buffer.concat(chunks).toString('utf8');
                return {
                    content,
                    wasTruncated: false,
                    totalBytes: content.length,
                    bytesRead: content.length,
                    truncationMessage: undefined
                };
            }
        }
        console.error(`Error reading S3 object ${key}:`, error);
        throw error;
    }
    throw new Error("Failed to read file content");
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
        '.zip': 'application/zip',
        '.py': 'text/x-python',
        '.ts': 'text/typescript',
        '.tsx': 'text/typescript'
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
    async ({ filename, startAtByte = 0 }) => {
        const maxBytes = 1024;
        try {
            // Normalize the path to prevent path traversal attacks
            const targetPath = path.normalize(filename);
            if (targetPath.startsWith("..")) {
                return JSON.stringify({ error: "Invalid file path. Cannot access files outside project root directory." });
            }

            const prefix = getS3KeyPrefix(targetPath);
            const s3Key = path.posix.join(prefix, targetPath);

            try {
                const result = await readS3Object({ key: s3Key, maxBytes, startAtByte });
                let displayContent = result.content;

                // Add truncation indicator if the file was truncated
                if (result.wasTruncated) {
                    const truncationMessage = result.truncationMessage || '';
                    displayContent = displayContent + truncationMessage;
                }

                return JSON.stringify({
                    content: displayContent,
                    wasTruncated: result.wasTruncated,
                    totalBytes: result.totalBytes,
                    bytesRead: result.bytesRead
                });
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
        description: "Reads the content of a file from S3 storage. Use 'global/filename' path to access shared files across all sessions. By default, only reads the first 500 bytes of data to prevent loading very large files.",
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
                const result = await readS3Object({ key: s3Key, maxBytes: 0, startAtByte: 0 }); // Read entire file for updates
                existingContent = result.content;
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
                    if (!existingContent || existingContent.length === 0 || !searchString) {
                        newContent = content;
                        break;
                    }

                    // // searchString is only required for non-empty files
                    // if (!searchString) {
                    //     return JSON.stringify({ error: "searchString is required for replace operation on non-empty files" });
                    // }

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

            const finalContent = await processDocumentLinks(newContent, getChatSessionId() || '');
            // Write the updated content to S3
            await writeS3Object(s3Key, finalContent);

            // Read back a portion of the file to verify the update
            const verificationResult = await readS3Object({ key: s3Key, maxBytes: 0, startAtByte: 0 });

            // Get lines of content for context
            const lines = verificationResult.content.split('\n');
            const contextLines = 3; // Number of lines to show before and after

            // Find the line number where the new content starts
            let contentStartLine = 0;
            if (operation === 'append') {
                contentStartLine = Math.max(0, lines.length - contextLines);
            } else if (operation === 'prepend') {
                contentStartLine = 0;
            } else if (operation === 'replace' && searchString) {
                // Find the line containing the new content
                contentStartLine = lines.findIndex(line => line.includes(content));
                if (contentStartLine === -1) contentStartLine = 0;
            }

            // Extract the relevant lines with context
            const startLine = Math.max(0, contentStartLine - contextLines);
            const endLine = Math.min(lines.length, contentStartLine + contextLines + 1);
            const contentWithContext = lines.slice(startLine, endLine).join('\n');

            const operationMessage = {
                "append": "appended to",
                "prepend": "prepended to",
                "replace": "updated in"
            }[operation];

            return JSON.stringify({
                success: true,
                message: `Content successfully ${operationMessage} file ${filename}`,
                operation,
                fileExistedBefore: fileExists,
                updatedContent: {
                    content: contentWithContext,
                    startLine: startLine + 1,
                    endLine: endLine,
                    wasTruncated: verificationResult.wasTruncated
                }
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

// Helper function to process document links
async function processDocumentLinks(content: string, chatSessionId: string): Promise<string> {
    // Get the origin from toolUtils
    const origin = getOrigin() || '';

    // Function to process a path and return the full URL
    const getFullUrl = (filePath: string) => {
        // Only process relative paths that don't start with http/https/files
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            return filePath;
        }

        // Handle global files differently
        if (filePath.startsWith('global/')) {
            return `${origin}/file/${filePath}`;
        }

        // Construct the full asset path for session-specific files
        return `${origin}/file/chatSessionArtifacts/sessionId=${chatSessionId}/${filePath}`;
    };

    // Regular expression to match href="path/to/file" patterns
    const linkRegex = /href="([^"]+)"/g;
    // Regular expression to match src="path/to/file" patterns in iframes
    const iframeSrcRegex = /<iframe[^>]*\ssrc="([^"]+)"[^>]*>/g;

    // First replace all href matches
    let processedContent = content.replace(linkRegex, (match, filePath) => {
        const fullPath = getFullUrl(filePath);
        return `href="${fullPath}"`;
    });

    // Then replace all iframe src matches
    processedContent = processedContent.replace(iframeSrcRegex, (match, filePath) => {
        const fullPath = getFullUrl(filePath);
        return match.replace(`src="${filePath}"`, `src="${fullPath}"`);
    });

    return processedContent;
}

// Tool to write a file to S3
export const writeFile = tool(
    async ({ filename, content }) => {
        console.log('writeFile tool called with filename:', filename, '. Origin: ', getOrigin());
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

            // Process HTML embeddings if this is an HTML file
            let finalContent = content;
            if (targetPath.toLowerCase().endsWith('.html')) {
                // Define allowed extensions for different types of content
                const allowedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
                const allowedIframeExtensions = ['.html', '.png', '.jpg', '.jpeg', '.gif', '.svg'];

                // Helper function to validate file extension
                const validateFileExtension = (src: string, allowedExts: string[], elementType: string) => {
                    const fileExtension = path.extname(src).toLowerCase();
                    if (!allowedExts.includes(fileExtension)) {
                        throw new Error(
                            `Invalid ${elementType} usage: src="${src}". ` +
                            `${elementType} can only be used with the following file types: ${allowedExts.join(', ')}`
                        );
                    }
                };

                // Validate iframe sources
                const iframeRegex = /<iframe[^>]*\ssrc="([^"]+)"[^>]*>/g;
                let match;
                while ((match = iframeRegex.exec(content)) !== null) {
                    validateFileExtension(match[1], allowedIframeExtensions, 'iframe');
                }

                // Validate image sources
                const imgRegex = /<img[^>]*\ssrc="([^"]+)"[^>]*>/g;
                while ((match = imgRegex.exec(content)) !== null) {
                    validateFileExtension(match[1], allowedImageExtensions, 'img');
                }

                // Process document links
                finalContent = await processDocumentLinks(content, getChatSessionId() || '');
            }

            // Write the file to S3
            await writeS3Object(s3Key, finalContent);

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
        description: `
        Writes content to a new file or overwrites an existing file in session storage. 
        For HTML files:
        1. Automatically processes document links:
           - Use paths relative to the workspace root (no ../ needed)
           - Example: href="plots/well_production_events.html" becomes 
             href="file/chatSessionArtifacts/sessionId=<chatSessionId>/plots/well_production_events.html"
           - External links (http://, https://) are left unchanged
           - Common path patterns:
             * plots/filename.html - for plot files
             * reports/filename.html - for report files
             * data/filename.csv - for data files
        
        2. For including content from other HTML files, use iframes:
           - IMPORTANT: iframes should ONLY be used for HTML files, never for CSV or other file types
           - Always use paths relative to the workspace root (no ../ needed)
           - Example:
           \`\`\`html
           <h2>Interactive Visualization</h2>
           <iframe src="plots/time_series_plot.html" width="100%" height="600px" frameborder="0"></iframe>
           \`\`\`
           - The src attribute will be automatically processed to use the correct full path
           - This approach maintains separation between files and allows independent loading
           - Set appropriate width and height attributes to control the iframe size
           - Use frameborder="0" for seamless integration
        
        Global files (global/filename) are read-only and cannot be written to.
        `,
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

        const progressPercentage = Math.round((processedCount / totalCount) * 100);
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

// Helper function for exponential backoff retry logic
async function retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    maxDelayMs: number = 10000
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // Check if it's a throttling error
            const isThrottlingError = error.message?.toLowerCase().includes('too many tokens') ||
                error.message?.toLowerCase().includes('rate limit') ||
                error.message?.toLowerCase().includes('throttle');

            if (!isThrottlingError) {
                throw error; // If it's not a throttling error, throw immediately
            }

            if (attempt === maxRetries - 1) {
                break; // On last attempt, break to throw the error
            }

            // Calculate delay with exponential backoff and jitter
            const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt) * (0.5 + Math.random()), maxDelayMs);
            console.log(`Throttling detected, retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw lastError;
}

// Convert textToTableTool to use the tool function from langchain
export const textToTableTool = tool(
    async (params: TextToTableParams) => {
        try {
            const origin = getOrigin() || '';
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

            // Search for matching files
            const matchingFiles: string[] = [];

            // Search in user files
            const userFiles = await findFilesMatchingPattern(
                getUserPrefix(),
                params.filePattern
            );
            matchingFiles.push(...userFiles);

            // Search in global files
            const globalWellFiles = await findFilesMatchingPattern(
                GLOBAL_PREFIX + 'well-files/',
                params.filePattern
            );
            matchingFiles.push(...globalWellFiles);

            const globalProductionFiles = await findFilesMatchingPattern(
                GLOBAL_PREFIX + 'production-data/',
                params.filePattern
            );
            matchingFiles.push(...globalProductionFiles);

            console.log(`Found ${matchingFiles.length} matching files`);

            // Filter out files which are not text files based on the suffix
            const textExtensions = ['.txt', '.md', '.json', '.jsonl', '.yaml', '.yml', '.xml'];
            const filteredFiles = matchingFiles.filter(file => {
                const lowerCaseFile = file.toLowerCase();
                return textExtensions.some(ext => lowerCaseFile.endsWith(ext.toLowerCase()));
            });

            // Check for no matches and provide helpful feedback
            if (filteredFiles.length === 0) {
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
            const maxFiles = params.maxFiles || 20;
            if (filteredFiles.length > maxFiles) {
                console.log(`Found ${filteredFiles.length} matching files, limiting to ${maxFiles}`);
                filteredFiles.splice(maxFiles);
            }

            console.log(`Processing ${filteredFiles.length} files`);

            // Remove filePath column if it already exists
            params.tableColumns = params.tableColumns.filter(column => column.columnName.toLowerCase() !== 'filepath');

            // Create column name map to restore original column names later
            const columnNameMap = Object.fromEntries(
                params.tableColumns
                    .filter(column => column.columnName !== normalizeColumnName(column.columnName))
                    .map(column => [normalizeColumnName(column.columnName), column.columnName])
            );

            // Add default score columns if dataToInclude or dataToExclude are provided
            let enhancedTableColumns = [...params.tableColumns];

            if (params.dataToInclude || params.dataToExclude) {
                enhancedTableColumns.push({
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

                enhancedTableColumns.push({
                    columnName: 'relevanceExplanation',
                    columnDescription: `Explain why this content received its relevance score.`,
                    columnDataDefinition: {
                        type: 'string'
                    }
                });
            }

            // If a table columnName includes "date", change the columnDataDefinition to be a date
            enhancedTableColumns.forEach(column => {
                if (column.columnName.toLowerCase().includes("date")) {
                    column.columnDataDefinition = {
                        type: ['string', 'null'],
                        format: 'date',
                        pattern: "^(?:\\d{4})-(?:(0[1-9]|1[0-2]))-(?:(0[1-9]|[12]\\d|3[01]))$"
                    };
                }
            });

            // enhancedTableColumns.unshift({
            //     columnName: 'date',
            //     columnDescription: `The date of the event in YYYY-MM-DD format. Can be null if no date is available.`,
            //     columnDataDefinition: {
            //         type: ['string', 'null'],
            //         format: 'date',
            //         pattern: "^(?:\\d{4})-(?:(0[1-9]|1[0-2]))-(?:(0[1-9]|[12]\\d|3[01]))$"
            //     }
            // });

            // Build JSON schema for structured output. Allow all columns to be nullable.
            const fieldDefinitions: Record<string, any> = {};
            for (const column of enhancedTableColumns) {
                const normalizedColumnName = normalizeColumnName(column.columnName);
                fieldDefinitions[normalizedColumnName] = {
                    ...(column.columnDataDefinition ? {
                        ...column.columnDataDefinition,
                        type: Array.isArray(column.columnDataDefinition.type)
                            ? [...new Set([...column.columnDataDefinition.type, 'null'])]  // Add 'null' if array
                            : [column.columnDataDefinition.type, 'null']  // Convert to array with 'null'
                    } : { type: ['string'] }),
                    description: column.columnDescription
                };
            }

            const enumValues = enhancedTableColumns.filter(column => column.columnDataDefinition?.enum).flatMap(column => column.columnDataDefinition?.enum) as string[];
            console.log('enumValues:', enumValues);

            const jsonSchema = {
                title: "extractTableData",
                description: "Extract structured data from text content",
                type: "object",
                properties: fieldDefinitions,
                required: Object.keys(fieldDefinitions).filter(key => key !== 'FilePath')
            };

            console.log('Target JSON schema for row:', JSON.stringify(jsonSchema, null, 2));


            // Process each file with concurrency limit
            const tableRows = [];
            const concurrencyLimit = parseInt(process.env.TEXT_TO_TABLE_CONCURRENCY || '2'); // Process x files at a time
            let processedCount = 0;

            // Process files in batches to avoid hitting limits
            for (let i = 0; i < filteredFiles.length; i += concurrencyLimit) {
                const batch = filteredFiles.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map(async (fileKey) => {
                    try {
                        const result = await readS3Object({ key: fileKey, maxBytes: 0, startAtByte: 0 });
                        const fileContent = result.content.substring(0, 10000); //Process a maximum of 10,000 characters

                        // Extract file path for display
                        const filePath = fileKey.startsWith(GLOBAL_PREFIX)
                            ? fileKey.replace(GLOBAL_PREFIX, 'global/')
                            : fileKey.replace(getUserPrefix(), '');

                        // Find each time one of the enum values appears in the file content
                        const enumMatches = enumValues.map(enumValue => {
                            // Split enum value into words and create regex pattern to match any of them
                            const words = enumValue.split(/\s+/);
                            const regexPattern = words.map(word => `\\b${word}\\b`).join('|');
                            const regex = new RegExp(regexPattern, 'gi');  // 'g' for global, 'i' for case-insensitive
                            const matches = [];
                            let match;

                            while ((match = regex.exec(fileContent)) !== null) {
                                matches.push({
                                    value: enumValue,
                                    matchedWord: match[0],
                                    index: match.index,
                                    context: fileContent.slice(Math.max(0, match.index - 100), match.index + 100 + match[0].length)
                                });
                            }

                            return matches.length > 0 ? matches : [];
                        });

                        console.log('enumMatches:', enumMatches);

                        //Create a message with the enum matches. Show 100 characters before and after the enum matches.
                        const enumMatchesMessage = `Enum matches found in the file: ${enumMatches.flat().map(m => m.value).join(', ')}. Showing 100 characters before and after each match.`;
                        console.log('enumMatchesMessage:', enumMatchesMessage);

                        // Build the message for AI processing
                        const messageText = `
                        Extract structured data from the following text content according to the provided schema.
                        <TextContent>
                        ${fileContent}
                        </TextContent>
                        <EnumMatches>
                        ${enumMatchesMessage}
                        </EnumMatches>
                        `;

                        try {
                            // Wrap the structured output extraction in retry logic
                            const structuredData = await retryWithExponentialBackoff(
                                async () => {
                                    if (!process.env.TEXT_TO_TABLE_MODEL_ID) {
                                        throw new Error("TEXT_TO_TABLE_MODEL_ID is not set");
                                    }
                                    return await getStructuredOutputResponse({
                                        modelId: process.env.TEXT_TO_TABLE_MODEL_ID,
                                        messages: [new HumanMessage(messageText)],
                                        outputStructure: jsonSchema
                                    });
                                },
                                1, // max retries
                                5000, // initial delay in ms
                                10000 // max delay in ms
                            );

                            // Add file path if requested
                            if (params.includeFilePath !== false) {
                                // structuredData['FilePath'] = filePath;
                                structuredData['FilePath'] = `${origin}/preview/${fileKey}`
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
                                errorRow['FilePath'] = `${origin}/preview/${fileKey}`;
                            }
                            return errorRow;
                        }
                    } catch (error: any) {
                        console.error(`Error processing file ${fileKey}:`, error);
                        // Add error row
                        const errorRow: Record<string, any> = {};
                        if (params.includeFilePath !== false) {
                            errorRow['FilePath'] = `${origin}/preview/${fileKey}`;
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
                await publishProgressUpdate(processedCount, filteredFiles.length, getChatSessionId() || '', new Date());
            }

            console.log(`Generated ${tableRows.length} table rows`);

            // Sort the table rows by the first column
            const firstColumnName = enhancedTableColumns[0].columnName;
            tableRows.sort((a, b) => {
                const valueA = a[firstColumnName];
                const valueB = b[firstColumnName];

                // Handle null/undefined values
                if (valueA === null || valueA === undefined) return 1;
                if (valueB === null || valueB === undefined) return -1;

                // Compare based on type
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return valueA - valueB;
                } else if (typeof valueA === 'string' && typeof valueB === 'string') {
                    return valueA.localeCompare(valueB);
                } else {
                    // Convert to strings for comparison if types don't match
                    return String(valueA).localeCompare(String(valueB));
                }
            });

            // Save the table as HTML
            try {
                // Create header from column names
                const columnNames = enhancedTableColumns
                    .filter(c => !['relevanceScore', 'relevanceExplanation'].includes(c.columnName))
                    .map(c => c.columnName);
                if (params.includeFilePath !== false) {
                    columnNames.push('FilePath');
                }

                // Create HTML content
                let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${params.tableTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        tr:hover { background-color: #f1f1f1; }
                        a { color: #0066cc; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                        h1 { color: #333; }
                    </style>
                </head>
                <body>
                    <table>
                        <thead>
                            <tr>
                                ${columnNames.map(name => `<th>${name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                `;

                // Add table rows with FilePath as links
                tableRows.forEach(row => {
                    if (row.EventType && row.EventType === 'administrative') return //Don't include administrative type events
                    htmlContent += '<tr>';
                    columnNames.forEach(colName => {
                        let cellValue = row[colName] === null || row[colName] === undefined ? '' : String(row[colName]);

                        // Make FilePath values into links
                        if (colName === 'FilePath' && cellValue) {
                            htmlContent += `<td><a href="${cellValue}" target="_blank">link</a></td>`;
                        } else {
                            htmlContent += `<td>${cellValue}</td>`;
                        }
                    });
                    htmlContent += '</tr>';
                });

                // Close the HTML structure
                htmlContent += `
                        </tbody>
                    </table>
                </body>
                </html>
                `;

                // Generate filename with .html extension
                const htmlFilename = `data/${params.tableTitle}.html`;

                // Save the HTML file
                await writeFile.invoke({
                    filename: htmlFilename,
                    content: htmlContent
                });

                // Add HTML file info to the response
                return JSON.stringify({
                    messageContentType: 'tool_table',
                    columns: enhancedTableColumns.map(c => c.columnName),
                    data: tableRows,
                    matchedFileCount: filteredFiles.length,
                    htmlFile: {
                        filename: htmlFilename,
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
                    matchedFileCount: filteredFiles.length,
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
        // Change to match the pattern anywhere in the path after the base prefix
        correctedPattern = `.*${correctedPattern}.*`;
        console.log(`Added wildcards to pattern: ${correctedPattern}`);
    }

    // First, try to extract a common prefix from the regex pattern if possible
    let searchPrefix = basePrefix;

    // If pattern starts with a literal part before any regex special chars, use it as prefix
    const prefixMatch = correctedPattern.match(/^([^\\.\*\+\?\|\(\)\[\]\{\}^$]+)/);
    if (prefixMatch && prefixMatch[1]) {
        // Don't append the prefix match to searchPrefix anymore since we want to match it anywhere
        console.log(`Found literal prefix in pattern: ${prefixMatch[1]}, but keeping base prefix for broader search`);
    }

    console.log(`Searching in S3 with prefix: ${searchPrefix}`);

    const matchingFiles: string[] = [];
    let continuationToken: string | undefined;

    do {
        try {
            const listCommonPrefixesResponse = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: searchPrefix,
                MaxKeys: 1000, // Fetch in larger batches,
                Delimiter: '/',
                ContinuationToken: continuationToken //Can be null
            }));

            // console.log('Common Prefixes: ', listCommonPrefixesResponse.CommonPrefixes)
            const matchingPrefixes = (listCommonPrefixesResponse.CommonPrefixes || [])
                .filter(item => {
                    if (!item.Prefix) return false
                    const relativePath = item.Prefix.replace(basePrefix, '');
                    const isMatch = fileMatchesPattern(relativePath, correctedPattern);
                    return isMatch
                })

            if (matchingPrefixes.length === 0 && matchingFiles.length === 0) matchingPrefixes.push({ Prefix: searchPrefix }) //If no matching prefixes are found, search for all file matches under the search prefix.
            console.log('Matching Prefixes: ', matchingPrefixes)

            for await (const item of matchingPrefixes) {
                const listFilesCommandResult = await s3Client.send(new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: item.Prefix,
                    MaxKeys: 1000, // Fetch in larger batches,
                }));
                (listFilesCommandResult.Contents || [])
                    .map(item => {
                        if (!item.Key) return
                        const relativePath = item.Key.replace(basePrefix, '');
                        const isMatch = fileMatchesPattern(relativePath, correctedPattern);
                        if (isMatch) matchingFiles.push(item.Key)
                    })
            }

            continuationToken = listCommonPrefixesResponse.NextContinuationToken;

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
                const globalWellFiles = await findFilesMatchingPattern(
                    GLOBAL_PREFIX + 'well-files/',
                    filePattern
                );
                matchingFiles.push(...globalWellFiles);

                const globalProductionFiles = await findFilesMatchingPattern(
                    GLOBAL_PREFIX + 'production-data/',
                    filePattern
                );
                matchingFiles.push(...globalProductionFiles);
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
