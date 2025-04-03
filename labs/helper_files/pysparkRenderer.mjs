import ReactDOMServer from 'react-dom/server';
import { createTheme } from '@mui/material/styles';
import { PySparkToolComponent } from '../../src/components/messageComponents/PySparkToolComponent.js';

// Create a default theme similar to your app's theme
export const defaultTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      contrastText: '#ffffff'
    },
    error: {
      main: '#d32f2f',
      dark: '#c62828',
      light: '#ffebee'
    },
    success: {
      main: '#4caf50',
      dark: '#388e3c'
    },
    warning: {
      main: '#ff9800'
    },
    grey: {
      50: '#fafafa',
      200: '#eeeeee',
      300: '#e0e0e0'
    },
    common: {
      white: '#ffffff'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    }
  },
  shape: {
    borderRadius: 4
  },
  spacing: (factor) => `${0.5 * factor}rem`
});

/**
 * Render PySpark output to HTML string
 * @param {Object|string} content - PySpark output content
 * @returns {string} HTML string representation of the component
 */
export function renderPySparkToHtml(content) {
  // If content is a string, wrap it in an object structure expected by the component
  if (typeof content === 'string') {
    content = { text: content };
  }
  
  // Render the component to static HTML
  const html = ReactDOMServer.renderToString(
    PySparkToolComponent({ content, theme: defaultTheme })
  );
  
  // Add required CSS for styling
  const fullHtml = `
    <style>
      /* Base styles */
      .pyspark-output {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .pyspark-output pre {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }
      .pyspark-output table {
        border-collapse: collapse;
        width: 100%;
      }
      .pyspark-output th, .pyspark-output td {
        text-align: left;
        padding: 8px;
      }
    </style>
    <div class="pyspark-output">
      ${html}
    </div>
  `;
  
  return fullHtml;
}

/**
 * Example usage:
 * 
 * import { renderPySparkToHtml } from './pysparkRenderer.mjs';
 * 
 * // Example PySpark output
 * const pysparkOutput = {
 *   text: JSON.stringify({
 *     status: "COMPLETED",
 *     output: {
 *       stdout: "DataFrame Result:\n+---+------+\n| id| name |\n+---+------+\n|  1|Alice |\n|  2|  Bob |\n+---+------+",
 *       stderr: "",
 *       message: "Execution completed successfully"
 *     }
 *   })
 * };
 * 
 * // Render to HTML
 * const html = renderPySparkToHtml(pysparkOutput);
 */ 