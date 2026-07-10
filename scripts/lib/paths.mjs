import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');

export const PATHS = {
  root: ROOT,
  postsJson: path.join(ROOT, 'data', 'posts.json'),
  queueJson: path.join(ROOT, 'data', 'queue.json'),
  draftsReview: path.join(ROOT, 'data', 'drafts', 'review'),
  draftsScheduled: path.join(ROOT, 'data', 'drafts', 'scheduled'),
  draftsPublished: path.join(ROOT, 'data', 'drafts', 'published'),
  imagesPosts: path.join(ROOT, 'images', 'posts')
};
