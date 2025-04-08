'use client';
import { Amplify } from 'aws-amplify';

// Function to safely load outputs
const loadOutputs = () => {
  try {
    return require('@/../amplify_outputs.json');
  } catch (error) {
    console.warn('amplify_outputs.json not found - this is expected during initial build');
    return null;
  }
};

const outputs = loadOutputs();
if (outputs) {
  Amplify.configure(outputs, { ssr: true });
} else {
  console.warn('Skipping Amplify configuration - outputs file not found');
}

const Page = () => null

export default Page;