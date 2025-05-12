import { expect } from 'chai';
import { textToTableTool } from '../../amplify/functions/tools/s3ToolBox';
import { writeFile } from '../../amplify/functions/tools/s3ToolBox';
import { setOrigin } from '../../amplify/functions/tools/toolUtils';
import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
import { setChatSessionId } from '../../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../utils';

setOrigin('http://localhost:3001')

describe('Text to Table Tool', function () {
  this.timeout(30000); // Set timeout to 30 seconds as text processing might take time

  before(async function() {
    await setAmplifyEnvVars();
    setChatSessionId('test');

    const outputs = loadOutputs();
    process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name;
    process.env.TEXT_TO_TABLE_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
    // process.env.TEXT_TO_TABLE_MODEL_ID = 'amazon.nova-pro-v1:0';
  });

  it('should convert text files to a structured table', async function() {
    const result = await textToTableTool.invoke({
      filePattern: '30045292020000_13_wf',
      tableTitle: 'test-table',
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
          // columnName: 'Rods yes or no',
          columnName: 'Artificial Lift Method',
          // columnDescription: `Does the word rods appear in the text?`,
          columnDescription: `ARTIFICIAL LIFT TYPE CLASSIFICATION RULES:

          IMPORTANT: This classification is ONLY about the artificial lift method used to produce the well.
          Do NOT consider the well type (Coal Bed Methane, Gas, Oil) or formation type in the classification.
          
          STEP 1 - CHECK FOR ROD PUMP:
          If ANY of these conditions are met, the artificial lift type MUST be 'Rod Pump':
            - Text contains ANY mention of 'rods', 'Rods & pump', 'RIH W/ PUMP & RODS'
            - Text mentions plans to 'install rods & pump' or states 'rods and pump will be installed'
            - Text shows existing 'Rods & pump' in tubing or completion details
            - Word 'rods' or 'RODS' appears in context of production, completion, installation plans, or equipment
            - Text contains phrases like 'Install rods & pump' in a procedure or job steps
            - Text mentions 'Rods and pump will likely be installed' or similar future plans
          
          STEP 2 - ONLY if NO Rod Pump indicators found above, check for:
            - 'Plunger Lift': Look for 'plunger lift' or 'bumper spring'
            - 'ESP': Look for 'electric submersible pump' or 'ESP'
            - 'Flowing': If no artificial lift mentioned and well is producing
            - 'None': If no production method specified
          
          Only use None if the text rods does not appear in the text.
          `,
          columnDataDefinition: {
            type: 'string',
            enum: [ "Rod Pump", "Plunger Lift", "ESP", "Flowing"] 
          }
        },
        {
          columnName: 'Explanation',
          columnDescription: 'A detailed explanation of the choice for artificial lift method',
          columnDataDefinition: {
            type: 'string',
          }
        }
      ]
    });

    console.log('result:\n', JSON.stringify(JSON.parse(result), null, 2));

    const parsedResult = JSON.parse(result);
    const targetRow = parsedResult.data.find((row: any) => row.FilePath === "global/well_api_number=3004529202/30045292020000_13_wf.pdf.yaml");
    const artificialLiftType = targetRow ? targetRow.ArtificialLiftType : null;
    expect(artificialLiftType).to.equal('Rod Pump');
  });
});
