import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export const compileLatex = async (req, res) => {
  const { code } = req.body;
  const tempDir = path.join(os.tmpdir(), uuidv4());
  const texFile = path.join(tempDir, 'document.tex');
  const pdfFile = path.join(tempDir, 'document.pdf');

  try {
    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });

    // Write LaTeX code to file
    await fs.writeFile(texFile, code);

    // Compile LaTeX to PDF using pdflatex
    await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFile}`);

    // Read the generated PDF
    const pdfContent = await fs.readFile(pdfFile);

    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });

    // Send PDF back to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(pdfContent);
  } catch (error) {
    console.error('Error compiling LaTeX:', error);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Error compiling LaTeX document' });
  }
};

export const saveDocument = async (req, res) => {
  const { documentId, code } = req.body;
  const userId = req.user.id;

  try {
    const document = await LatexDocument.findOneAndUpdate(
      { _id: documentId, userId },
      { code },
      { new: true, upsert: true }
    );

    res.json(document);
  } catch (error) {
    console.error('Error saving document:', error);
    res.status(500).json({ error: 'Error saving document' });
  }
};

export const getDocument = async (req, res) => {
  const { documentId } = req.params;
  const userId = req.user.id;

  try {
    const document = await LatexDocument.findOne({ _id: documentId, userId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Error fetching document' });
  }
}; 