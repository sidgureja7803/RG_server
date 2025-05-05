import pdf from 'html-pdf';
import { promisify } from 'util';

// Convert callback-based pdf.create to Promise-based
const createPdf = promisify(pdf.create);

const defaultOptions = {
  format: 'A4',
  orientation: 'portrait',
  border: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm'
  },
  timeout: 30000,
  footer: {
    height: '10mm'
  },
  type: 'pdf',
  quality: '100'
};

export const generatePDF = async (html, options = {}) => {
  try {
    const mergedOptions = {
      ...defaultOptions,
      ...options
    };

    const buffer = await createPdf(html, mergedOptions);
    return buffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
};

// Helper function to convert resume sections to HTML
export const resumeToHTML = (resume) => {
  try {
    const styles = `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        .content {
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
    `;

    const sections = resume.sections.map(section => `
      <div class="section" style="${generateSectionStyles(section.style)}">
        <div class="section-title">${section.title}</div>
        <div class="content">${formatContent(section.content)}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          ${sections}
        </body>
      </html>
    `;
  } catch (error) {
    console.error('HTML generation error:', error);
    throw new Error('Failed to generate HTML');
  }
};

// Helper function to generate CSS styles for a section
const generateSectionStyles = (style = {}) => {
  const styleProps = {
    'font-family': style.fontFamily || 'Arial, sans-serif',
    'font-size': style.fontSize ? `${style.fontSize}px` : '14px',
    'font-weight': style.fontWeight || 'normal',
    'color': style.color || '#000',
    'background-color': style.backgroundColor || 'transparent',
    'border': style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || '#000'}` : 'none',
    'border-radius': style.borderRadius ? `${style.borderRadius}px` : '0',
    'padding': style.padding ? `${style.padding}px` : '0'
  };

  return Object.entries(styleProps)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
};

// Helper function to format section content
const formatContent = (content) => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content.map(item => `<div>${item}</div>`).join('');
  }
  
  if (typeof content === 'object') {
    return Object.entries(content)
      .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
      .join('');
  }
  
  return '';
};

export default {
  generatePDF,
  resumeToHTML
}; 