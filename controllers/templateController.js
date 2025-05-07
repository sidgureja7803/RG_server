import AWS from 'aws-sdk';
import Template from '../models/Template.js';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({
      $or: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    }).sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Error fetching templates' });
  }
};

export const uploadTemplate = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique key for S3
    const fileKey = `templates/${userId}/${uuidv4()}-${file.originalname}`;
    const previewKey = `previews/${userId}/${uuidv4()}-preview.png`;

    // Upload template to S3
    await s3.upload({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype
    }).promise();

    // Generate preview (you'll need to implement this based on your requirements)
    const previewBuffer = await generatePreview(file.buffer);

    // Upload preview to S3
    await s3.upload({
      Bucket: BUCKET_NAME,
      Key: previewKey,
      Body: previewBuffer,
      ContentType: 'image/png'
    }).promise();

    // Create template record in database
    const template = new Template({
      name,
      description,
      s3Key: fileKey,
      previewUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${previewKey}`,
      userId,
      isPublic: isPublic === 'true'
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ error: 'Error uploading template' });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const template = await Template.findOne({ _id: templateId, userId });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete from S3
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: template.s3Key
    }).promise();

    // Delete preview if exists
    const previewKey = template.previewUrl.split(`${BUCKET_NAME}.s3.amazonaws.com/`)[1];
    if (previewKey) {
      await s3.deleteObject({
        Bucket: BUCKET_NAME,
        Key: previewKey
      }).promise();
    }

    // Delete from database
    await template.remove();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Error deleting template' });
  }
};

export const getTemplateContent = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const template = await Template.findOne({
      _id: templateId,
      $or: [
        { userId },
        { isPublic: true }
      ]
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get template content from S3
    const data = await s3.getObject({
      Bucket: BUCKET_NAME,
      Key: template.s3Key
    }).promise();

    // Update download count
    template.downloads += 1;
    await template.save();

    res.send(data.Body.toString());
  } catch (error) {
    console.error('Error fetching template content:', error);
    res.status(500).json({ error: 'Error fetching template content' });
  }
};

// Helper function to generate preview (implement based on your requirements)
const generatePreview = async (templateBuffer) => {
  // Implement preview generation logic here
  // This could involve converting LaTeX to PDF and then to PNG
  // For now, return a placeholder
  return Buffer.from('placeholder');
}; 