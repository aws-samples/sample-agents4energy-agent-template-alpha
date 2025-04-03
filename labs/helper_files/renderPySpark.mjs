import { renderPySparkToHtml } from './pysparkRenderer.mjs';
import fs from 'fs/promises';

async function main() {
  // Example PySpark output with a table and text
  const pysparkOutput = {
    text: JSON.stringify({
      status: "COMPLETED",
      output: {
        stdout: "DataFrame Results:\n+---+----------+------+\n| id|      name|  city|\n+---+----------+------+\n|  1|     Alice|London|\n|  2|       Bob|  NYC|\n|  3|   Charlie|Berlin|\n|  4|      Dave|Sydney|\n+---+----------+------+\n\n\nData Summary:\nTotal rows: 4\nNull values: 0\nData types: integer, string, string",
        stderr: "",
        message: "Execution completed successfully"
      }
    })
  };
  
  // Render to HTML
  const html = renderPySparkToHtml(pysparkOutput);
  
  // Save to file
  await fs.writeFile('pyspark-output.html', html);
  console.log('HTML output saved to pyspark-output.html');
  
  // Example with an error
  const errorOutput = {
    text: JSON.stringify({
      status: "FAILED",
      output: {
        stdout: "",
        stderr: "Traceback (most recent call last):\n  File \"<stdin>\", line 1, in <module>\nNameError: name 'undefined_variable' is not defined",
        message: "Execution failed"
      }
    })
  };
  
  // Render error to HTML
  const errorHtml = renderPySparkToHtml(errorOutput);
  
  // Save to file
  await fs.writeFile('pyspark-error.html', errorHtml);
  console.log('Error HTML output saved to pyspark-error.html');
}

// Run the example
main().catch(console.error); 