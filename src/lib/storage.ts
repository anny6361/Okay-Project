import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

export async function uploadToStorage(path: string, dataUrlOrFile: string | File): Promise<string> {
  const fileRef = ref(storage, path);
  
  if (typeof dataUrlOrFile === 'string') {
    // If it's a data URL (base64)
    await uploadString(fileRef, dataUrlOrFile, 'data_url');
  } else {
    // If it's a File object
    await uploadBytes(fileRef, dataUrlOrFile);
  }
  
  return await getDownloadURL(fileRef);
}
