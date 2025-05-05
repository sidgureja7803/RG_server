import mongoose from 'mongoose';
import Template from '../models/template.model.js';
import config from '../config/database.js';

const templates = [
  {
    name: 'Modern Professional',
    description: 'Clean and contemporary design with a focus on visual hierarchy.',
    thumbnail: '/templates/thumbnails/modern-professional.png',
    previewImage: '/templates/previews/modern-professional.png',
    features: [
      'Minimalist layout',
      'Professional typography',
      'Skills progress bars',
      'Timeline experience section'
    ],
    category: 'Modern',
    structure: {
      layout: 'single-column',
      sections: {
        header: {
          type: 'header',
          fields: ['name', 'title', 'contact']
        },
        summary: {
          type: 'text',
          title: 'Professional Summary'
        },
        experience: {
          type: 'timeline',
          title: 'Work Experience',
          items: []
        },
        education: {
          type: 'timeline',
          title: 'Education',
          items: []
        },
        skills: {
          type: 'progress',
          title: 'Skills',
          items: []
        }
      }
    },
    metadata: {
      colors: [
        { name: 'Primary', value: '#2563eb' },
        { name: 'Secondary', value: '#1e40af' },
        { name: 'Text', value: '#111827' }
      ],
      fonts: [
        { name: 'Heading', value: 'Inter' },
        { name: 'Body', value: 'Inter' }
      ],
      spacing: {
        sectionGap: '2rem',
        itemGap: '1rem'
      }
    }
  },
  {
    name: 'Creative Portfolio',
    description: 'Unique design for creative professionals and designers.',
    thumbnail: '/templates/thumbnails/creative-portfolio.png',
    previewImage: '/templates/previews/creative-portfolio.png',
    features: [
      'Portfolio section',
      'Custom skill visualization',
      'Project highlights',
      'Personal branding elements'
    ],
    category: 'Creative',
    isPremium: true,
    structure: {
      layout: 'two-column',
      sections: {
        header: {
          type: 'header-creative',
          fields: ['name', 'title', 'contact', 'social']
        },
        portfolio: {
          type: 'gallery',
          title: 'Portfolio',
          items: []
        },
        experience: {
          type: 'cards',
          title: 'Experience',
          items: []
        },
        skills: {
          type: 'bubbles',
          title: 'Skills',
          items: []
        }
      }
    },
    metadata: {
      colors: [
        { name: 'Primary', value: '#ec4899' },
        { name: 'Secondary', value: '#be185d' },
        { name: 'Text', value: '#111827' }
      ],
      fonts: [
        { name: 'Heading', value: 'Poppins' },
        { name: 'Body', value: 'Poppins' }
      ],
      spacing: {
        sectionGap: '2.5rem',
        itemGap: '1.5rem'
      }
    }
  }
];

const seedTemplates = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing templates
    await Template.deleteMany({});
    console.log('Cleared existing templates');

    // Insert new templates
    await Template.insertMany(templates);
    console.log('Seeded templates successfully');

    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
};

seedTemplates(); 