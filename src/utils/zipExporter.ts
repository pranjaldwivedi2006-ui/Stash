import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../android-code/files';

export async function downloadAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root folder
  const root = zip.folder('StashAndroidApp');

  if (!root) {
    throw new Error('Failed to create zip folder');
  }

  // Add each file to zip
  for (const file of ANDROID_PROJECT_FILES) {
    root.file(file.path, file.content);
  }

  // Generate blob
  const content = await zip.generateAsync({ type: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Stash-Android-JetpackCompose-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
