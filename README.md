# Resume Generator Server

This is the server component of the Resume Generator application. It provides APIs for resume creation, analysis, and ATS score calculation.

## Setup Instructions

### Prerequisites

- Node.js (v16.x or higher)
- MongoDB (local instance or MongoDB Atlas)
- Google Gemini API key for resume analysis

### Installation

1. Clone the repository
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory with the following content:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/resume-generator
   
   # JWT Secret for Authentication
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   
   # AI Services - REQUIRED for resume analysis
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Client URL for Redirects
   CLIENT_URL=http://localhost:5173
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Setting up Gemini API

The resume analyzer uses Google's Gemini API to analyze resumes and provide insights. Follow these steps to set up your API key:

1. Go to the [Google AI Studio](https://ai.google.dev/) and sign in with your Google account
2. Navigate to "Get API key" and create a new key
3. Copy the API key and paste it in the `.env` file as the value for `GEMINI_API_KEY`

### Troubleshooting Resume Analysis

If the resume analysis feature is not working correctly, check the following:

1. Ensure your `.env` file contains a valid `GEMINI_API_KEY`
2. Check that the server has internet access to reach Google's API
3. Verify that the uploaded file is in a supported format (PDF, DOC, DOCX, or TXT)
4. Check the server logs for any specific error messages

## API Endpoints

### Resume Analysis

- `POST /api/analyzer/match`: Analyze a resume against a job description
  - Required: `resume` (file) and `jobDescription` (text)
  - Returns match score, matched skills, missing skills, and ATS score

## License

[MIT](LICENSE) 