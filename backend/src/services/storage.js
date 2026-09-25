/**
 * Private object-storage contract.
 * Replace with S3-compatible implementation in production.
 */
export class StorageProvider {
  async createUpload(_meta) {
    throw new Error('Private storage provider is not configured');
  }
  async createDownloadUrl(_key) {
    throw new Error('Private storage provider is not configured');
  }
}