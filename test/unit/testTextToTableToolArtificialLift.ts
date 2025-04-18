import { expect } from 'chai';
import { textToTableTool } from '../../amplify/functions/tools/s3ToolBox';
import { writeFile } from '../../amplify/functions/tools/s3ToolBox';
import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
import { setChatSessionId } from '../../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../utils';

describe('Text to Table Tool', function () {
  this.timeout(30000); // Set timeout to 30 seconds as text processing might take time

  before(async function() {
    await setAmplifyEnvVars();
    setChatSessionId('test');

    const outputs = loadOutputs();
    process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name;
    process.env.TEXT_TO_TABLE_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
  });

  it('should convert text files to a structured table', async function() {
    const result = await textToTableTool.invoke({
      filePattern: '30045292020000_13_wf',
      tableTitle: 'test',
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
          columnName: 'ArtificialLiftType',
          columnDescription: `CRITICAL EXTRACTION RULES (in order of precedence):
          1. EXPLICIT ROD PUMP PHRASES:
            - If 'rods', 'Rods & pump', 'RIH W/ PUMP & RODS', or similar phrases are found, ALWAYS classify as 'Rod Pump'.
          2. ROD CONTEXT:
            - If 'rods' or 'RODS' appears in ANY context related to production or well completion, classify as 'Rod Pump'.
          3. SECONDARY CRITERIA (if no rods mentioned):
            - 'Plunger Lift': Search for 'plunger lift' or 'bumper spring'
            - 'ESP': Search for 'electric submersible pump' or 'ESP'
            - 'Flowing': If no artificial lift is mentioned and well is producing
            - 'None': If absolutely no production method is specified`,
          columnDataDefinition: {
            type: 'string',
            enum: [ "Rod Pump", "Plunger Lift", "ESP", "Flowing", "None" ] 
          }
        }
      ]
    });

    console.log('result:\n', JSON.stringify(JSON.parse(result), null, 2));

    const artificialLiftType = JSON.parse(result).data[0].ArtificialLiftType;
    expect(artificialLiftType).to.equal('Rod Pump');
  });
});
