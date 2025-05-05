import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample resume and job description files
const resumePath = path.join(__dirname, 'sample-data', 'sample-resume.txt');
const jobDescriptionPath = path.join(__dirname, 'sample-data', 'sample-job-description.txt');

// Test function
async function testAnalyzer() {
  try {
    // Load sample data
    console.log('Reading sample files...');
    const resumeText = fs.readFileSync(resumePath, 'utf8');
    const jobDescription = fs.readFileSync(jobDescriptionPath, 'utf8');
    
    // Create text file for upload
    const tempResumePath = path.join(__dirname, 'sample-data', 'temp-resume.txt');
    fs.writeFileSync(tempResumePath, resumeText);
    
    // Create form data
    const formData = new FormData();
    formData.append('resume', fs.createReadStream(tempResumePath), {
      filename: 'resume.txt',
      contentType: 'text/plain',
    });
    formData.append('jobDescription', jobDescription);
    
    console.log('Testing analyzer with:');
    console.log('- Sample resume: Text file');
    console.log('- Sample job description: Senior Frontend Developer position');
    console.log('Sending request to API...');
    
    // Make request to local API (assuming server is running)
    const response = await axios.post('http://localhost:3001/api/analyzer/match', formData, {
      headers: formData.getHeaders()
    });
    
    // Display results
    console.log('\n===== ANALYSIS RESULTS =====\n');
    console.log(`Match Score: ${response.data.matchScore}%`);
    
    console.log('\nMatched Skills:');
    response.data.matchedSkills.forEach(skill => console.log(`- ${skill}`));
    
    console.log('\nMissing Skills:');
    response.data.missingSkills.forEach(skill => console.log(`- ${skill}`));
    
    console.log('\nRecommendations:');
    console.log(response.data.recommendations);
    
    // Clean up
    fs.unlinkSync(tempResumePath);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }
}

// Run the test
testAnalyzer();

/* 
To run this test:
1. Make sure your server is running (npm run dev)
2. Run this script with: node --experimental-modules tests/test-analyzer.js
*/ 