import { expect } from 'chai';
import { textToTableTool } from '../../amplify/functions/tools/s3ToolBox';
import { writeFile } from '../../amplify/functions/tools/s3ToolBox';
import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
import { setChatSessionId } from '../../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../utils';
import { backendOutputStackMetadataSchema } from '@aws-amplify/backend-output-schemas';

describe('Text to Table Tool', function () {
  this.timeout(30000); // Set timeout to 30 seconds as text processing might take time

  // Helper function to create test files
  async function createTestFile(filename: string, content: string) {
    await writeFile.invoke({
      filename,
      content
    });
  }

  before(async function() {
    await setAmplifyEnvVars();
    setChatSessionId('test');

    const outputs = loadOutputs();
    process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name;
    process.env.TEXT_TO_TABLE_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

    // Create some test files
    await createTestFile('data/test1.txt', `
      Date: 2024-03-15
      Customer: John Doe
      Order ID: 12345
      Amount: $150.00
      Status: Completed
    `);

    await createTestFile('data/test2.txt', `
      Date: 2024-03-16
      Customer: Jane Smith
      Order ID: 12346
      Amount: $200.00
      Status: Pending
    `);
  });

  it('should convert text files to a structured table', async function() {
    const result = await textToTableTool.invoke({
      filePattern: 'data/test.*\\.txt$',
      tableTitle: 'orders',
      tableColumns: [
        {
          columnName: 'Date',
          columnDescription: 'The date of the order in YYYY-MM-DD format',
          columnDataDefinition: {
            type: 'string',
            format: 'date'
          }
        },
        {
          columnName: 'Customer',
          columnDescription: 'The name of the customer'
        },
        {
          columnName: 'OrderID',
          columnDescription: 'The unique order identifier',
          columnDataDefinition: {
            type: 'string'
          }
        },
        {
          columnName: 'Amount',
          columnDescription: 'The order amount in USD',
          columnDataDefinition: {
            type: 'string'
          }
        },
        {
          columnName: 'Status',
          columnDescription: 'The current status of the order',
          columnDataDefinition: {
            type: 'string'
          }
        }
      ]
    });

    const parsedResult = JSON.parse(result);
    expect(parsedResult.error).to.be.undefined;
    expect(parsedResult.data).to.be.an('array');
    expect(parsedResult.data.length).to.equal(2);
    
    // Verify the structure of the data
    const firstRow = parsedResult.data[0];
    expect(firstRow).to.have.property('Date');
    expect(firstRow).to.have.property('Customer');
    expect(firstRow).to.have.property('OrderID');
    expect(firstRow).to.have.property('Amount');
    expect(firstRow).to.have.property('Status');

    // Verify the CSV file was created
    expect(parsedResult.csvFile).to.exist;
    expect(parsedResult.csvFile.filename).to.equal('data/orders.csv');
    expect(parsedResult.csvFile.rowCount).to.equal(2);
  });

  it('should handle non-existent files gracefully', async function() {
    const result = await textToTableTool.invoke({
      filePattern: 'nonexistent/.*\\.txt$',
      tableTitle: 'nonexistent',
      tableColumns: [
        {
          columnName: 'Test',
          columnDescription: 'Test column'
        }
      ]
    });

    const parsedResult = JSON.parse(result);
    expect(parsedResult.error).to.exist;
    expect(parsedResult.suggestions).to.be.an('array');
  });

  it('should handle relevance scoring', async function() {
    const result = await textToTableTool.invoke({
      filePattern: 'data/test.*\\.txt$',
      tableTitle: 'orders_with_relevance',
      tableColumns: [
        {
          columnName: 'Customer',
          columnDescription: 'The name of the customer'
        },
        {
          columnName: 'Amount',
          columnDescription: 'The order amount in USD'
        }
      ],
      dataToInclude: 'high value orders over $175',
      dataToExclude: 'pending orders'
    });

    const parsedResult = JSON.parse(result);
    expect(parsedResult.error).to.be.undefined;
    expect(parsedResult.data).to.be.an('array');
    
    // Verify relevance columns were added
    const firstRow = parsedResult.data[0];
    expect(firstRow).to.have.property('relevanceScore');
    expect(firstRow).to.have.property('relevanceExplanation');
    expect(firstRow.relevanceScore).to.be.a('number');
    expect(firstRow.relevanceScore).to.be.within(0, 10);
  });

  it('should handle file path inclusion', async function() {
    const result = await textToTableTool.invoke({
      filePattern: 'data/test.*\\.txt$',
      tableTitle: 'orders_with_filepath',
      tableColumns: [
        {
          columnName: 'Customer',
          columnDescription: 'The name of the customer'
        }
      ],
      includeFilePath: true
    });

    const parsedResult = JSON.parse(result);
    expect(parsedResult.error).to.be.undefined;
    expect(parsedResult.data).to.be.an('array');
    
    // Verify FilePath column is present
    const firstRow = parsedResult.data[0];
    expect(firstRow).to.have.property('FilePath');
    expect(firstRow.FilePath).to.match(/^data\/test\d\.txt$/);
  });
});
